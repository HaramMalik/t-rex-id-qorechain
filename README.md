# T-REX ID on QoreChain: Quantum-Safe ERC-3643 Institutional RWA Identity

[![License: MIT](https://img.shields.io/badge/License-MIT-00FFC2?style=for-the-badge)](./LICENSE)
[![Network: QoreChain Diana](https://img.shields.io/badge/QoreChain-Diana%20Testnet%20(9800)-06b6d4?style=for-the-badge)](https://dashboard.qorechain.io/explorer)
[![Standard: ERC-3643](https://img.shields.io/badge/Standard-ERC--3643%20%2F%20ONCHAINID-a855f7?style=for-the-badge)](https://erc3643.org)
[![Security: NIST FIPS 203/204](https://img.shields.io/badge/PQC-NIST%20FIPS%20203%2F204%20ML--DSA--87-10b981?style=for-the-badge)](https://build.qorechain.io/kits)

> **Build Before Q-Day Open-Source Integration Repository**
> This public repository open-sources T-REX ID's complete **QoreChain Diana Testnet (Chain ID: 9800)** integration—including all 5 deployed ERC-3643 smart contracts, hybrid Post-Quantum Cryptography (`ML-DSA-87` / `ML-KEM-1024`) signing envelopes, same-origin RPC relay proxy, read-only on-chain verification scripts, and verified QoreChain Contract Vault UI components under the **MIT License**.

---

## 1. Architecture Overview

T-REX ID brings institutional Real-World Asset (RWA) tokenization and regulatory compliance (FINMA / Swiss DLT Act / SEC 144A) onto **QoreChain Diana** to protect tokenized securities against harvest-now, decrypt-later quantum threats (**Q-Day**):

```text
  Institutional Investor / Issuer Wallet (ECDSA secp256k1 + ML-DSA-87 PQC Envelope)
                                        |
                                        v
        /api/qorechain/rpc & /api/qorechain/telemetry (server/qorechainProxy.ts)
                                        |
                                        v
  +-----------------------------------------------------------------------------+
  |             QoreChain Diana Testnet (EVM Chain ID: 9800)                    |
  |                                                                             |
  |  1. TREXFactory              -> Deterministic T-REX suite deployer          |
  |  2. IdentityRegistryStorage  -> Bound ONCHAINID & ISO-3166 country codes    |
  |  3. TrustedIssuersRegistry   -> Master Node Topics [100, 101, 103, 105]     |
  |  4. ModularCompliance        -> Gate-1 transfer restriction evaluator       |
  |  5. SwissQuantumBondToken    -> CH-QOR-01 (6 decimals) permissioned bond    |
  +-----------------------------------------------------------------------------+
```

---

## 2. Verified Smart Contracts on QoreChain Diana (Chain ID: `9800`)

All 5 ERC-3643 core contracts are deployed, verified on-chain, and anchored to Sovereign Owner authority (`0x2935dbbF9b6DF9901E882Ee2f3304331B3c90B03` / `qor19y6ah0umdhueq85g9m30xvzrxxeujzcrcqeymm`):

| Contract | Symbol | EVM Address (`0x`) | Cosmos Bech32 (`qor1`) | Block | Dashboard Explorer |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **SwissQuantumBondToken** | `CH-QOR-01` | `0x6A9ca1D10c054C5aE9f5F597c7662083110a9834` | `qor1d2w2r5gvq4x946047ktuwe3qsvgs4xp5w9fzs2` | `#9,822,896` | [Inspect Token](https://dashboard.qorechain.io/explorer/address/0x6A9ca1D10c054C5aE9f5F597c7662083110a9834) |
| **IdentityRegistryStorage** | — | `0x174b948095D6D6d4692C1187977AE26bceB973c9` | `qor1za9efqy46mtdg6fvzxrew7hzd08tju7fsc8t79` | `#9,822,887` | [Inspect Storage](https://dashboard.qorechain.io/explorer/address/0x174b948095D6D6d4692C1187977AE26bceB973c9) |
| **TrustedIssuersRegistry** | — | `0x1cd4A4FDe8f5189aEeFD88F00621c0410BE42EFb` | `qor1rn22fl0g75vf4mha3rcqvgwqgy97gthml34fee` | `#9,822,889` | [Inspect Registry](https://dashboard.qorechain.io/explorer/address/0x1cd4A4FDe8f5189aEeFD88F00621c0410BE42EFb) |
| **ModularCompliance** | — | `0xA5E22734a86f4099EEA5e3ed03C818149ebbD546` | `qor15h3zwd9gdaqfnm49u0ks8jqczj0th42xdalqat` | `#9,822,892` | [Inspect Compliance](https://dashboard.qorechain.io/explorer/address/0xA5E22734a86f4099EEA5e3ed03C818149ebbD546) |
| **TREXFactory** | — | `0x110e9080FcB2DC0025262eD6eD213dc17dB6454E` | `qor1zy8fpq8uktwqqffx9mtw6gfac97mv32w869yvz` | `#9,822,894` | [Inspect Factory](https://dashboard.qorechain.io/explorer/address/0x110e9080FcB2DC0025262eD6eD213dc17dB6454E) |

### Sovereign Authority & Relayer Accounts
* **Master Sovereign Node (Trusted Issuer & Agent):** `qor1xkgjactk7qpcqr4arfsgrx5a75g50ne6uwv0qr` / `0x35912ee176F003800eBd1A60819A9Df51147cF3A`
* **Sovereign Owner & Admin:** `qor19y6ah0umdhueq85g9m30xvzrxxeujzcrcqeymm` / `0x2935dbbF9b6DF9901E882Ee2f3304331B3c90B03`
* **Gas Broadcaster (Deployer / Faucet Wallet):** `qor18sp9j6zplpun44zu4ryqdzpq6cs2wc7mrtt9ad` / `0x3C02596841f8793ad45Ca8c8068820d620A763dB`

### Key On-Chain Proof Transactions
* **CH-QOR-01 Bond Deployment:** `0x87750a7b6a5e709589ee0056a5120e45bd68167591af93b22a353d6a6c376067`
* **CH-QOR-01 Institutional Mint & Issuance:** `0xe23052a6e71af2f1cd8f2ac96a7a29af0a306b47f4db5885ce5bf6d06b125771`

---

## 3. QoreChain Kits & SDKs Integrated
* `@qorechain/sdk` — Multi-VM RPC provider & Triple-VM abstraction (`src/services/qorechainPqcService.ts`)
* `@qorechain/qoresign` — NIST FIPS 204 (`ML-DSA-87`) hybrid EVM window authorization envelope builder
* `@qorechain/wallet-adapter` — Wallet connection & live address verification

---

## 4. Repository Structure

```text
├── contracts/
│   ├── MockERC3643.sol                 # SwissQuantumBondToken (CH-QOR-01, 6 decimals)
│   ├── TREXFactory.sol                 # Deterministic T-REX suite deployer
│   ├── TREX_Compliance.sol             # ModularCompliance gate evaluator
│   ├── TrustedIssuersRegistry.sol      # Authorized issuers & topics [100,101,103,105]
│   ├── TrexToken.sol                   # Reference ERC-3643 permissioned token
│   └── storage/
│       └── IdentityRegistryStorage.sol # Investor ONCHAINID & country vault
├── scripts/
│   ├── verifyLiveState.mjs             # Live bytecode & token metadata probe
│   └── testComplianceIntegration.mjs   # Full Gate-1 compliance integration test suite
├── server/
│   └── qorechainProxy.ts               # Express RPC & Diana telemetry relay proxy
├── src/
│   ├── services/
│   │   └── qorechainPqcService.ts      # QoreChain constants, Bech32 map & PQC helpers
│   └── components/
│       ├── ContractsPage.tsx           # Verified QoreChain Suite Explorer UI
│       └── QoreChainKitsSection.tsx    # Official QoreChain Developer Kits showcase
├── qorechain-deployment.json           # Deployment manifest, tx hashes & contract ABIs
├── AI_USAGE.md                         # AI-Native bounty transparency log
├── LICENSE                             # MIT License
└── package.json
```

---

## 5. Run Live On-Chain Verification

```bash
# 1. Install dependencies
npm install

# 2. Verify live bytecode & token state on QoreChain Diana (Chain ID 9800)
npm run verify:live

# 3. Run the complete ERC-3643 compliance & issuer topic integration suite
npm run verify:compliance

# 4. Start the local QoreChain RPC proxy relay on port 3000
npm run start:proxy
```
