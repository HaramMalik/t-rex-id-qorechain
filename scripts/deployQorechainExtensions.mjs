import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { ethers } from "ethers";
import * as sdk from "@qorechain/sdk";
import dotenv from "dotenv";

dotenv.config();

const RPC_URL = process.env.QORECHAIN_DIANA_RPC || "https://evm-testnet.qore.host";
const REST_URL = process.env.QORECHAIN_REST_URL || "https://api-testnet.qore.host";
const CHAIN_ID = 9800;
const COSMOS_CHAIN_ID = "qorechain-diana";

const SIGNER_PRIVATE_KEY =
  process.env.BROADCASTER_PRIVATE_KEY ||
  process.env.RELAYER_PRIVATE_KEY ||
  process.env.PRIVATE_KEY;

const SIGNER_MNEMONIC =
  process.env.FUNDED_WALLET_2_MNEMONIC ||
  process.env.BROADCASTER_MNEMONIC ||
  process.env.MNEMONIC;

const INITIAL_OWNER =
  process.env.SOVEREIGN_OWNER || "0x2935dbbF9b6DF9901E882Ee2f3304331B3c90B03";
const IDENTITY_REGISTRY =
  process.env.IDENTITY_REGISTRY || "0x174b948095D6D6d4692C1187977AE26bceB973c9";
const DEFAULT_BROADCASTER_BECH32 = "qor18sp9j6zplpun44zu4ryqdzpq6cs2wc7mrtt9ad";

const PREFLIGHT_ONLY = process.argv.includes("--preflight-only");
const FORCE_BROADCAST = process.argv.includes("--force");
const SHOULD_DISPATCH_SYNC =
  process.argv.includes("--dispatch-sync") || process.env.DISPATCH_CROSSVM_SYNC === "true";

const MANIFEST_PATH = resolve("deployments/qorechain-diana-9800.json");

const QORECHAIN_TX_OVERRIDES = {
  maxFeePerGas: 255000000000n,
  maxPriorityFeePerGas: 20000000000n
};

// Standard BIP-173 Bech32 encoder for deriving qor1... from 20-byte EVM address
const BECH32_CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
function bech32Polymod(values) {
  const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  let chk = 1;
  for (const v of values) {
    const top = chk >> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ v;
    for (let i = 0; i < 5; i++) {
      if ((top >> i) & 1) chk ^= GEN[i];
    }
  }
  return chk;
}
function bech32HrpExpand(hrp) {
  const ret = [];
  for (let i = 0; i < hrp.length; i++) ret.push(hrp.charCodeAt(i) >> 5);
  ret.push(0);
  for (let i = 0; i < hrp.length; i++) ret.push(hrp.charCodeAt(i) & 31);
  return ret;
}
function convertBits(data, fromBits, toBits) {
  let acc = 0;
  let bits = 0;
  const ret = [];
  const maxv = (1 << toBits) - 1;
  for (const value of data) {
    acc = (acc << fromBits) | value;
    bits += fromBits;
    while (bits >= toBits) {
      bits -= toBits;
      ret.push((acc >> bits) & maxv);
    }
  }
  if (bits > 0) ret.push((acc << (toBits - bits)) & maxv);
  return ret;
}
function evmToQorBech32(evmAddress) {
  const bytes = ethers.getBytes(ethers.getAddress(evmAddress));
  const words = convertBits(bytes, 8, 5);
  const hrp = "qor";
  const values = [...bech32HrpExpand(hrp), ...words, 0, 0, 0, 0, 0, 0];
  const mod = bech32Polymod(values) ^ 1;
  const checksum = [];
  for (let p = 0; p < 6; p++) checksum.push((mod >> (5 * (5 - p))) & 31);
  return `${hrp}1${[...words, ...checksum].map((d) => BECH32_CHARSET[d]).join("")}`;
}

function getArgValue(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1].trim();
  return null;
}

function loadArtifact(relativePath) {
  return JSON.parse(readFileSync(resolve(relativePath), "utf8"));
}

async function runPreFlightCheck(bech32Address) {
  const accountUrl = `${REST_URL}/qorechain/pqc/v1/account/${bech32Address}`;
  const windowUrl = `${REST_URL}/qorechain/pqc/v1/evm_window/${bech32Address}`;

  const [accRes, winRes] = await Promise.all([fetch(accountUrl), fetch(windowUrl)]);
  if (!accRes.ok || !winRes.ok) {
    throw new Error(
      `Pre-flight REST query failed (account HTTP ${accRes.status}, evm_window HTTP ${winRes.status})`
    );
  }
  const [accountData, windowData] = await Promise.all([accRes.json(), winRes.json()]);

  const acc = accountData?.account ?? null;
  const accountFound = Boolean(accountData?.found && acc);
  const algorithmId = Number(acc?.algorithm_id ?? 0);
  const algorithmName = acc?.algorithm_name || "none";
  const possessionProven = Boolean(acc?.possession_proven);

  const windowLive = Boolean(windowData?.live);
  const remainingBlocks = Number(windowData?.remaining_blocks || "0");
  const remainingTxs = Number(windowData?.remaining_txs || "0");
  const nativeOnly = Boolean(windowData?.native_only);
  const allowedTargets = Array.isArray(windowData?.allowed_targets) ? windowData.allowed_targets : [];

  const hasUsablePqcKey = accountFound && algorithmId === 1 && possessionProven;
  const hasLiveWindow =
    windowLive && remainingBlocks > 0 && remainingTxs >= 4 && !nativeOnly && allowedTargets.length === 0;

  console.log("-----------------------------------------------------------------");
  console.log("PRE-FLIGHT GATE CHECK (QoreChain Diana REST)");
  console.log("-----------------------------------------------------------------");
  console.log("  Bech32 Address:      ", bech32Address);
  console.log("  Account Endpoint:    ", accountUrl);
  console.log("  EVM Window Endpoint: ", windowUrl);
  console.log("  PQC Account Found:   ", accountFound);
  console.log("  PQC Algorithm:       ", `${algorithmName} (algorithm_id=${algorithmId})`);
  console.log("  Possession Proven:   ", possessionProven);
  console.log("  EVM Window Found:    ", Boolean(windowData?.found));
  console.log("  EVM Window Live:     ", windowLive);
  console.log("  Expiry Block Height: ", windowData?.expiry_height || "0");
  console.log("  Remaining Blocks:    ", remainingBlocks);
  console.log("  Remaining Txs:       ", `${remainingTxs} (used ${windowData?.used_txs || 0}/${windowData?.max_txs || 0})`);
  console.log("  Native Only:         ", nativeOnly);
  console.log("  Allowed Targets:     ", allowedTargets.length === 0 ? "unrestricted" : allowedTargets.join(", "));
  console.log("  Ready To Broadcast:  ", hasUsablePqcKey && hasLiveWindow ? "YES" : "NO (BLOCKED)");
  console.log("");

  if (!hasUsablePqcKey || !hasLiveWindow) {
    console.log("REQUIRED COSMOS-LANE ACTIONS BEFORE EVM BROADCAST:");
    if (!hasUsablePqcKey) {
      console.log("  1) Register ML-DSA-87 key & prove possession (MsgRegisterPQCKeyV2):");
      console.log(
        `     qored tx pqc register-key-v2 --algorithm 1 --from ${bech32Address} --chain-id ${COSMOS_CHAIN_ID} --node https://rpc-testnet.qore.host:443 --gas auto --gas-adjustment 1.3 -y`
      );
    }
    if (!hasLiveWindow) {
      console.log("  2) Open unrestricted EVM authorization window (MsgOpenEVMWindow, max 17280 blocks):");
      console.log(
        `     qored tx pqc open-evm-window --blocks 17280 --max-txs 100 --max-value 50000000000 --from ${bech32Address} --chain-id ${COSMOS_CHAIN_ID} --node https://rpc-testnet.qore.host:443 --gas auto --gas-adjustment 1.3 -y`
      );
      console.log(
        "     (Covers 3 contract creations + 1 0x0901 Cross-VM call with unrestricted target addresses.)"
      );
    }
    console.log("");
  }

  return {
    bech32Address,
    hasUsablePqcKey,
    hasLiveWindow,
    ready: hasUsablePqcKey && hasLiveWindow,
    accountData,
    windowData
  };
}

async function tryAutoOpenEvmWindowWithSdk(targetBech32) {
  if (!SIGNER_MNEMONIC) return false;
  try {
    const account = await sdk.deriveUnifiedAccount(SIGNER_MNEMONIC);
    if (account.cosmos.toLowerCase() !== targetBech32.toLowerCase()) {
      return false;
    }
    console.log("[AUTO-WINDOW]: Opening hybrid PQC EVM window via @qorechain/sdk for", account.cosmos);
    const pqcKeypair = sdk.derivePqcCanonical(account.cosmos, SIGNER_MNEMONIC);
    const restClient = new sdk.RestClient(REST_URL);
    const authRes = await restClient.get(`/cosmos/auth/v1beta1/accounts/${account.cosmos}`);
    const acc = authRes.account?.base_account || authRes.account || {};
    const accountNumber = parseInt(acc.account_number || "0", 10);
    const sequence = parseInt(acc.sequence || "0", 10);

    const openMsg = sdk.openEvmWindowMsg({
      sender: account.cosmos,
      blocks: 17280,
      maxTxs: 100,
      maxValue: "50000000000",
      nativeOnly: false,
      allowedTargets: []
    });

    const fee = {
      amount: [{ denom: "uqor", amount: "25000" }],
      gas: "250000"
    };

    account.pqc = pqcKeypair;
    const signer = new sdk.EthNativeSigner(account, {
      signMode: "hybrid",
      rest: REST_URL
    });
    const signBytesVersion = await signer.resolveSignBytesVersion(COSMOS_CHAIN_ID);
    const { txRawBytes } = await signer.sign({
      chainId: COSMOS_CHAIN_ID,
      accountNumber,
      sequence,
      messages: [openMsg],
      fee,
      signBytesVersion
    });

    const bcastRes = await fetch(`${REST_URL}/cosmos/tx/v1beta1/txs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tx_bytes: Buffer.from(txRawBytes).toString("base64"),
        mode: "BROADCAST_MODE_SYNC"
      })
    }).then((r) => r.json());
    const r = bcastRes?.tx_response || {};
    const res = {
      code: r.code || 0,
      transactionHash: r.txhash || "",
      rawLog: r.raw_log,
      codespace: r.codespace
    };

    console.log("  MsgOpenEVMWindow Broadcast Tx:", res.transactionHash, "(code:", res.code, ")");
    if (res.code !== 0) {
      console.warn("  MsgOpenEVMWindow warning:", res.rawLog);
      return false;
    }

    for (let i = 0; i < 8; i++) {
      await new Promise((r) => setTimeout(r, 2500));
      const win = await fetch(`${REST_URL}/qorechain/pqc/v1/evm_window/${account.cosmos}`).then((r) =>
        r.json()
      );
      if (win?.live) {
        console.log(
          `  [WINDOW LIVE]: opened_height=${win.opened_height}, expiry_height=${win.expiry_height}, remaining_txs=${win.remaining_txs}\n`
        );
        return true;
      }
    }
  } catch (err) {
    console.warn("[AUTO-WINDOW NOTICE]:", err?.message || err);
  }
  return false;
}

async function main() {
  const cliAddress = getArgValue("--address");

  if (PREFLIGHT_ONLY) {
    let targetBech32 = DEFAULT_BROADCASTER_BECH32;
    if (cliAddress) {
      targetBech32 = ethers.isAddress(cliAddress) ? evmToQorBech32(cliAddress) : cliAddress;
    } else if (SIGNER_PRIVATE_KEY) {
      targetBech32 = evmToQorBech32(new ethers.Wallet(SIGNER_PRIVATE_KEY).address);
    }
    const result = await runPreFlightCheck(targetBech32);
    process.exit(result.ready ? 0 : 2);
  }

  if (!SIGNER_PRIVATE_KEY) {
    console.error(
      "Missing PRIVATE_KEY or BROADCASTER_PRIVATE_KEY environment variable. Copy .env.example to .env and set your funded Diana Testnet broadcaster key."
    );
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL, CHAIN_ID, {
    staticNetwork: true
  });
  const wallet = new ethers.Wallet(SIGNER_PRIVATE_KEY, provider);
  const broadcasterBech32 = process.env.BROADCASTER_BECH32 || evmToQorBech32(wallet.address);

  let preflight = await runPreFlightCheck(broadcasterBech32);
  if (!preflight.ready && preflight.hasUsablePqcKey && !preflight.hasLiveWindow) {
    const opened = await tryAutoOpenEvmWindowWithSdk(broadcasterBech32);
    if (opened) {
      preflight = await runPreFlightCheck(broadcasterBech32);
    }
  }

  if (!preflight.ready && !FORCE_BROADCAST) {
    console.error(
      "Halting before EVM broadcast because pre-flight gate failed (see Cosmos CLI commands above). Re-run once evm_window.live === true (or pass --force to override)."
    );
    process.exit(2);
  }

  const balance = await provider.getBalance(wallet.address);

  console.log("=================================================================");
  console.log("T-REX ID ?? QoreChain Diana (Chain ID 9800) Extensions Deployment");
  console.log("=================================================================");
  console.log("  Broadcaster EVM:   ", wallet.address);
  console.log("  Broadcaster qor1:  ", broadcasterBech32);
  console.log("  Balance:           ", ethers.formatEther(balance), "QOR");
  console.log("  Initial Owner:     ", INITIAL_OWNER);
  console.log("  IdentityRegistry:  ", IDENTITY_REGISTRY);
  console.log("");

  // 1. Deploy TrexPqcIdentityModule (0x0A01 + 0x0A02 ERC-3643 ModularCompliance extension)
  console.log("[1/3] Deploying TrexPqcIdentityModule...");
  const pqcModuleArt = loadArtifact(
    "artifacts/contracts/TrexPqcIdentityModule.sol/TrexPqcIdentityModule.json"
  );
  const pqcModuleFactory = new ethers.ContractFactory(pqcModuleArt.abi, pqcModuleArt.bytecode, wallet);
  const pqcModule = await pqcModuleFactory.deploy(
    INITIAL_OWNER,
    IDENTITY_REGISTRY,
    QORECHAIN_TX_OVERRIDES
  );
  const pqcModuleTx = pqcModule.deploymentTransaction();
  console.log("  Broadcast Tx Hash:      ", pqcModuleTx?.hash);
  await pqcModule.waitForDeployment();
  const pqcModuleReceipt = pqcModuleTx ? await provider.getTransactionReceipt(pqcModuleTx.hash) : null;
  const pqcModuleAddress = await pqcModule.getAddress();
  const pqcActive = await pqcModule.precompileActive();
  console.log("  Deployed Address:       ", pqcModuleAddress);
  console.log("  Confirmed Block:        ", pqcModuleReceipt?.blockNumber ?? "unknown");
  console.log("  0x0A02 precompileActive:", pqcActive);
  console.log("");

  // 2. Deploy PqcERC7913Verifier (ONCHAINID v3 / OpenZeppelin AccountERC7579 ML-DSA-87 verifier)
  console.log("[2/3] Deploying PqcERC7913Verifier...");
  const verifierArt = loadArtifact(
    "artifacts/contracts/PqcERC7913Verifier.sol/PqcERC7913Verifier.json"
  );
  const verifierFactory = new ethers.ContractFactory(verifierArt.abi, verifierArt.bytecode, wallet);
  const verifier = await verifierFactory.deploy(QORECHAIN_TX_OVERRIDES);
  const verifierTx = verifier.deploymentTransaction();
  console.log("  Broadcast Tx Hash:      ", verifierTx?.hash);
  await verifier.waitForDeployment();
  const verifierReceipt = verifierTx ? await provider.getTransactionReceipt(verifierTx.hash) : null;
  const verifierAddress = await verifier.getAddress();
  const magicValue = await verifier.ERC7913_MAGIC_VALUE();
  const verifyActive = await verifier.precompileActive();
  console.log("  Deployed Address:       ", verifierAddress);
  console.log("  Confirmed Block:        ", verifierReceipt?.blockNumber ?? "unknown");
  console.log("  ERC7913_MAGIC_VALUE:    ", magicValue);
  console.log("  0x0A01 precompileActive:", verifyActive);
  console.log("");

  // 3. Deploy TrexCrossVmBridgeModule (0x0901 EVM-to-Native CosmWasm bridge adapter)
  console.log("[3/3] Deploying TrexCrossVmBridgeModule...");
  const bridgeArt = loadArtifact(
    "artifacts/contracts/TrexCrossVmBridgeModule.sol/TrexCrossVmBridgeModule.json"
  );
  const bridgeFactory = new ethers.ContractFactory(bridgeArt.abi, bridgeArt.bytecode, wallet);
  const bridge = await bridgeFactory.deploy(
    INITIAL_OWNER,
    IDENTITY_REGISTRY,
    false,
    QORECHAIN_TX_OVERRIDES
  );
  const bridgeTx = bridge.deploymentTransaction();
  console.log("  Broadcast Tx Hash:      ", bridgeTx?.hash);
  await bridge.waitForDeployment();
  const bridgeReceipt = bridgeTx ? await provider.getTransactionReceipt(bridgeTx.hash) : null;
  const bridgeAddress = await bridge.getAddress();
  const nativeTarget = await bridge.nativeTargetContract();
  console.log("  Deployed Address:       ", bridgeAddress);
  console.log("  Confirmed Block:        ", bridgeReceipt?.blockNumber ?? "unknown");
  console.log("  Native Target (VM 1):   ", nativeTarget);
  console.log("");

  let crossVmSyncTxHash = null;
  let crossVmSyncBlock = null;
  if (SHOULD_DISPATCH_SYNC) {
    console.log("[4/4] Dispatching live 0x0901 Cross-VM Identity Sync receipt...");
    const keyspaceDigest = ethers.keccak256(
      ethers.toUtf8Bytes(`TREX_ONCHAINID_V3_CROSSVM_${wallet.address}`)
    );
    const syncTx = await bridge.dispatchIdentitySync(
      wallet.address,
      broadcasterBech32,
      keyspaceDigest,
      1,
      QORECHAIN_TX_OVERRIDES
    );
    console.log("  Cross-VM Sync Tx Hash:  ", syncTx.hash);
    const receipt = await syncTx.wait(1);
    crossVmSyncTxHash = syncTx.hash;
    crossVmSyncBlock = receipt?.blockNumber ? Number(receipt.blockNumber) : null;
    console.log("  Confirmed Block:        ", crossVmSyncBlock);
    console.log("");
  }

  const manifest = {
    network: COSMOS_CHAIN_ID,
    chainId: CHAIN_ID,
    evmRpc: RPC_URL,
    restApi: REST_URL,
    deployedAt: new Date().toISOString(),
    broadcasterEvm: wallet.address,
    broadcasterBech32,
    initialOwner: INITIAL_OWNER,
    identityRegistry: IDENTITY_REGISTRY,
    extensions: {
      TrexPqcIdentityModule: {
        address: pqcModuleAddress,
        txHash: pqcModuleTx?.hash || null,
        blockNumber: pqcModuleReceipt?.blockNumber ? Number(pqcModuleReceipt.blockNumber) : null,
        precompiles: ["0x0000000000000000000000000000000000000a01", "0x0000000000000000000000000000000000000a02"]
      },
      PqcERC7913Verifier: {
        address: verifierAddress,
        txHash: verifierTx?.hash || null,
        blockNumber: verifierReceipt?.blockNumber ? Number(verifierReceipt.blockNumber) : null,
        magicValue,
        precompiles: ["0x0000000000000000000000000000000000000a01"]
      },
      TrexCrossVmBridgeModule: {
        address: bridgeAddress,
        txHash: bridgeTx?.hash || null,
        blockNumber: bridgeReceipt?.blockNumber ? Number(bridgeReceipt.blockNumber) : null,
        nativeTarget,
        precompiles: ["0x0000000000000000000000000000000000000901"],
        crossVmSyncTxHash,
        crossVmSyncBlock
      }
    },
    buildQorechainMapping: {
      shipWeeksFirstPqcCheckTxHash: pqcModuleTx?.hash || verifierTx?.hash || null,
      crossVmEvmToNativeTxHash: crossVmSyncTxHash,
      editProjectAddresses: [pqcModuleAddress, verifierAddress, bridgeAddress],
      submissionDeadlineUtc: "2026-12-02T23:59:00Z"
    }
  };

  mkdirSync(dirname(MANIFEST_PATH), { recursive: true });
  writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  console.log("=================================================================");
  console.log("DEPLOYMENT MANIFEST WRITTEN:", MANIFEST_PATH);
  console.log("=================================================================");
  console.log(JSON.stringify(manifest, null, 2));
}

main().catch((err) => {
  console.error("Deployment failed:", err?.shortMessage || err?.message || err);
  console.error(
    "Ensure your account has a verified ML-DSA-87 PQC key and an active MsgOpenEVMWindow on QoreChain Diana."
  );
  process.exit(1);
});
