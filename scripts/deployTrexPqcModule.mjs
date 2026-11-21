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

const QORECHAIN_TX_OVERRIDES = {
  maxFeePerGas: 255000000000n,
  maxPriorityFeePerGas: 20000000000n
};

async function main() {
  if (!PRIVATE_KEY) {
    console.error(
      "Missing PRIVATE_KEY environment variable. Copy .env.example to .env and set your funded Diana Testnet broadcaster key with an active scoped EVM window."
    );
    process.exit(1);
  }

  const artifactPath = resolve(
    "artifacts/contracts/TrexPqcIdentityModule.sol/TrexPqcIdentityModule.json"
  );
  const artifact = JSON.parse(readFileSync(artifactPath, "utf8"));

  const provider = new ethers.JsonRpcProvider(RPC_URL, CHAIN_ID, {
    staticNetwork: true
  });
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log("Deploying TrexPqcIdentityModule to QoreChain Diana (Chain ID 9800)...");
  console.log("  Broadcaster:", wallet.address);
  console.log("  Initial Owner:", INITIAL_OWNER);
  console.log("  IdentityRegistry:", IDENTITY_REGISTRY);

  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const contract = await factory.deploy(
    INITIAL_OWNER,
    IDENTITY_REGISTRY,
    QORECHAIN_TX_OVERRIDES
  );

  const deployTx = contract.deploymentTransaction();
  console.log("  Broadcast Tx Hash:", deployTx?.hash);
  await contract.waitForDeployment();

  const deployedAddress = await contract.getAddress();
  console.log("  TrexPqcIdentityModule Address:", deployedAddress);

  // Post-deploy smoke verification of 0x0A02 precompile inside live bytecode
  const active = await contract.precompileActive();
  const status = await contract.keyStatus(wallet.address);
  console.log("  0x0A02 precompileActive():", active);
  console.log("  Broadcaster 0x0A02 keyStatus:", {
    responded: status.responded,
    registered: status.registered,
    algorithmId: Number(status.algorithmId),
    possessionProven: status.possessionProven
  });
  console.log("\nPaste the Broadcast Tx Hash into Ship Weeks -> 'First contract with a PQC check'.");
}

main().catch((err) => {
  console.error("Deployment failed:", err?.shortMessage || err?.message || err);
  console.error(
    "Ensure your account has an active QoreChain EVM authorization window (MsgOpenEVMWindow) and sufficient QOR balance."
  );
  process.exit(1);
});
