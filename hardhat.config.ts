import hardhatToolboxMochaEthersPlugin from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import dotenv from "dotenv";
dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY;

export default {
  plugins: [hardhatToolboxMochaEthersPlugin],
  solidity: {
    version: "0.8.24",
    settings: {
      evmVersion: "cancun",
      optimizer: { enabled: true, runs: 200 },
      viaIR: true
    }
  },
  networks: {
    qorechainDiana: {
      type: "http",
      url: process.env.QORECHAIN_DIANA_RPC || "https://evm-testnet.qore.host",
      chainId: 9800,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : []
    }
  }
};
