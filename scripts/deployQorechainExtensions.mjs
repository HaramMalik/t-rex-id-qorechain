import { readFileSync } from "fs";
import { resolve } from "path";
import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

const RPC_URL = process.env.QORECHAIN_DIANA_RPC || "https://evm-testnet.qore.host";
const CHAIN_ID = 9800;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const INITIAL_OWNER =
  process.env.SOVEREIGN_OWNER || "0x2935dbbF9b6DF9901E882Ee2f3304331B3c90B03";
const IDENTITY_REGISTRY =
  process.env.IDENTITY_REGISTRY || "0x174b948095D6D6d4692C1187977AE26bceB973c9";
const SHOULD_DISPATCH_SYNC =
  process.argv.includes("--dispatch-sync") || process.env.DISPATCH_CROSSVM_SYNC === "true";

const QORECHAIN_TX_OVERRIDES = {
  maxFeePerGas: 255000000000n,
  maxPriorityFeePerGas: 20000000000n
};

function loadArtifact(relativePath) {
  const fullPath = resolve(relativePath);
  return JSON.parse(readFileSync(fullPath, "utf8"));
}

async function main() {
  if (!PRIVATE_KEY) {
    console.error(
      "Missing PRIVATE_KEY environment variable. Copy .env.example to .env and set your funded Diana Testnet broadcaster key with an active scoped EVM window."
    );
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL, CHAIN_ID, {
    staticNetwork: true
  });
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const balance = await provider.getBalance(wallet.address);

  console.log("=================================================================");
  console.log("T-REX ID · QoreChain Diana (Chain ID 9800) Extensions Deployment");
  console.log("=================================================================");
  console.log("  Broadcaster:      ", wallet.address);
  console.log("  Balance:          ", ethers.formatEther(balance), "QOR");
  console.log("  Initial Owner:    ", INITIAL_OWNER);
  console.log("  IdentityRegistry: ", IDENTITY_REGISTRY);
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
  console.log("  Broadcast Tx Hash:    ", pqcModuleTx?.hash);
  await pqcModule.waitForDeployment();
  const pqcModuleAddress = await pqcModule.getAddress();
  console.log("  Deployed Address:     ", pqcModuleAddress);
  const pqcActive = await pqcModule.precompileActive();
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
  console.log("  Broadcast Tx Hash:    ", verifierTx?.hash);
  await verifier.waitForDeployment();
  const verifierAddress = await verifier.getAddress();
  console.log("  Deployed Address:     ", verifierAddress);
  const magicValue = await verifier.ERC7913_MAGIC_VALUE();
  const verifyActive = await verifier.precompileActive();
  console.log("  ERC7913_MAGIC_VALUE:  ", magicValue);
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
  console.log("  Broadcast Tx Hash:    ", bridgeTx?.hash);
  await bridge.waitForDeployment();
  const bridgeAddress = await bridge.getAddress();
  console.log("  Deployed Address:     ", bridgeAddress);
  const nativeTarget = await bridge.nativeTargetContract();
  console.log("  Native Target (VM 1): ", nativeTarget);
  console.log("");

  let crossVmSyncTxHash = null;
  if (SHOULD_DISPATCH_SYNC) {
    console.log("[Optional] Dispatching live 0x0901 Cross-VM Identity Sync receipt...");
    const broadcasterBech32 =
      process.env.BROADCASTER_BECH32 || "qor18sp9j6zplpun44zu4ryqdzpq6cs2wc7mrtt9ad";
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
    console.log("  Cross-VM Sync Tx Hash:", syncTx.hash);
    const receipt = await syncTx.wait(1);
    crossVmSyncTxHash = syncTx.hash;
    console.log("  Confirmed Block:      ", receipt?.blockNumber);
    console.log("");
  }

  console.log("=================================================================");
  console.log("DEPLOYMENT SUMMARY (QoreChain Diana Testnet · Chain ID 9800)");
  console.log("=================================================================");
  console.log(
    JSON.stringify(
      {
        chainId: CHAIN_ID,
        broadcaster: wallet.address,
        TrexPqcIdentityModule: {
          address: pqcModuleAddress,
          txHash: pqcModuleTx?.hash
        },
        PqcERC7913Verifier: {
          address: verifierAddress,
          txHash: verifierTx?.hash
        },
        TrexCrossVmBridgeModule: {
          address: bridgeAddress,
          txHash: bridgeTx?.hash,
          nativeTarget,
          crossVmSyncTxHash
        }
      },
      null,
      2
    )
  );
  console.log("");
  console.log("Next Steps:");
  console.log(
    "  1. Paste TrexPqcIdentityModule or PqcERC7913Verifier Tx Hash into Ship Weeks -> 'First contract with a PQC check'."
  );
  console.log(
    "  2. Paste TrexCrossVmBridgeModule address into the UI (ONCHAINID v3 Panel -> 'Dispatch Cross-VM Identity Sync (0x0901)') or re-run with --dispatch-sync to verify the 'Cross-VM, EVM to Native' badge on-chain."
  );
}

main().catch((err) => {
  console.error("Deployment failed:", err?.shortMessage || err?.message || err);
  console.error(
    "Ensure your account has an active QoreChain EVM authorization window (MsgOpenEVMWindow) and sufficient QOR balance."
  );
  process.exit(1);
});
