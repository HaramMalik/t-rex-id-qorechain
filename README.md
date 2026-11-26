# T-REX ID on QoreChain: Quantum-Safe ERC-3643 Institutional RWA Identity

[![Built on QoreChain](https://build.qorechain.io/badge/t-rex-id-quantum-safe-erc-3643-institutional-ide.svg)](https://build.qorechain.io/p/t-rex-id-quantum-safe-erc-3643-institutional-ide)
[![License: MIT](https://img.shields.io/badge/License-MIT-00FFC2?style=for-the-badge)](./LICENSE)
[![Network: QoreChain Diana](https://img.shields.io/badge/QoreChain-Diana%20Testnet%20(9800)-06b6d4?style=for-the-badge)](https://dashboard.qorechain.io/explorer)
[![Standard: ERC-3643](https://img.shields.io/badge/Standard-ERC--3643%20%2F%20ONCHAINID-a855f7?style=for-the-badge)](https://erc3643.org)
[![Security: NIST FIPS 203/204](https://img.shields.io/badge/PQC-NIST%20FIPS%20203%2F204%20ML--DSA--87-10b981?style=for-the-badge)](https://build.qorechain.io/kits)

> **Build Before Q-Day Open-Source Integration Repository**
> This public repository open-sources T-REX ID's **QoreChain Diana Testnet (Chain ID: 9800)** integration???including all 5 deployed ERC-3643 smart contracts, three additive post-quantum & cross-VM precompile modules (`TrexPqcIdentityModule.sol` calling `0x0A01`/`0x0A02`, `PqcERC7913Verifier.sol` for official ONCHAINID v3 / OpenZeppelin `AccountERC7579` ML-DSA-87 verification, and `TrexCrossVmBridgeModule.sol` calling `0x0901` EVM-to-Native CosmWasm), `@qorechain/qoreseal` (`ML-KEM-1024`) selective disclosure encryption, `@qorechain/qorescan` CBOM + FINMA Guidance 05/2026 audit artifacts, same-origin RPC relay proxy, and 12 adversarial Hardhat unit tests under the **MIT License**.

---

## 1. Architecture Overview

T-REX ID brings institutional Real-World Asset (RWA) tokenization and regulatory compliance (FINMA / Swiss DLT Act / SEC 144A) onto **QoreChain Diana** while staying 100% compliant with standard ERC-3643 and ONCHAINID v3 (ERC-7579 / ERC-7913 / ERC-7930):

```text
  Institutional Wallet (ECDSA secp256k1 + ML-DSA-87 + @qorechain/qoreseal ML-KEM-1024)
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
  |  6. TrexPqcIdentityModule    -> Calls 0x0A01 (pqcVerify) & 0x0A02 KeyStatus |
  |  7. PqcERC7913Verifier       -> ONCHAINID v3 ERC-7913 ML-DSA-87 (0x024ad318)|
  |  8. TrexCrossVmBridgeModule  -> 0x0901 EVM -> Native CosmWasm Receipt Sync  |
  +-----------------------------------------------------------------------------+
```

---

## 2. Verified Smart Contracts on QoreChain Diana (Chain ID: `9800`)

All 5 ERC-3643 core contracts are deployed, verified on-chain, and anchored to Sovereign Owner authority (`0x2935dbbF9b6DF9901E882Ee2f3304331B3c90B03` / `qor19y6ah0umdhueq85g9m30xvzrxxeujzcrcqeymm`):

| Contract | Symbol | EVM Address (`0x`) | Cosmos Bech32 (`qor1`) | Block | Dashboard Explorer |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **SwissQuantumBondToken** | `CH-QOR-01` | `0x6A9ca1D10c054C5aE9f5F597c7662083110a9834` | `qor1d2w2r5gvq4x946047ktuwe3qsvgs4xp5w9fzs2` | `#9,822,896` | [Inspect Token](https://dashboard.qorechain.io/explorer/address/0x6A9ca1D10c054C5aE9f5F597c7662083110a9834) |
| **IdentityRegistryStorage** | ??? | `0x174b948095D6D6d4692C1187977AE26bceB973c9` | `qor1za9efqy46mtdg6fvzxrew7hzd08tju7fsc8t79` | `#9,822,887` | [Inspect Storage](https://dashboard.qorechain.io/explorer/address/0x174b948095D6D6d4692C1187977AE26bceB973c9) |
| **TrustedIssuersRegistry** | ??? | `0x1cd4A4FDe8f5189aEeFD88F00621c0410BE42EFb` | `qor1rn22fl0g75vf4mha3rcqvgwqgy97gthml34fee` | `#9,822,889` | [Inspect Registry](https://dashboard.qorechain.io/explorer/address/0x1cd4A4FDe8f5189aEeFD88F00621c0410BE42EFb) |
| **ModularCompliance** | ??? | `0xA5E22734a86f4099EEA5e3ed03C818149ebbD546` | `qor15h3zwd9gdaqfnm49u0ks8jqczj0th42xdalqat` | `#9,822,892` | [Inspect Compliance](https://dashboard.qorechain.io/explorer/address/0xA5E22734a86f4099EEA5e3ed03C818149ebbD546) |
| **TREXFactory** | ??? | `0x110e9080FcB2DC0025262eD6eD213dc17dB6454E` | `qor1zy8fpq8uktwqqffx9mtw6gfac97mv32w869yvz` | `#9,822,894` | [Inspect Factory](https://dashboard.qorechain.io/explorer/address/0x110e9080FcB2DC0025262eD6eD213dc17dB6454E) |

### Additive Post-Quantum & Cross-VM Precompile Modules (Live on Chain ID `9800`)

| Extension Contract | Precompiles | EVM Address (`0x`) | Block | Deploy / Proof Tx Hash |
| :--- | :--- | :--- | :--- | :--- |
| **TrexPqcIdentityModule** | `0x0A01`, `0x0A02` | `0x62600c1C206C089a68D53c65eE19A3f4A98e26a2` | `#10,680,152` | [`0xc9e9e475...7488fbfa`](https://dashboard.qorechain.io/explorer/tx/0xc9e9e475ad65ef40c2cff03fc10e562ebd663eda63bc40522e99f01c7488fbfa) |
| **PqcERC7913Verifier** | `0x0A01` (`0x024ad318`) | `0xFcd34140F26AF7bCb8935DdeF90F1936b36A1FAe` | `#10,680,154` | [`0xee4c2036...25f59041`](https://dashboard.qorechain.io/explorer/tx/0xee4c20364dc6978faee1e0f4dc75292e9cd81deb1bf08312eb73d8c125f59041) |
| **TrexCrossVmBridgeModule** | `0x0901` (VM `1` Native) | `0x72E4B9507cBd76b9177d61c8a14bd127201EAE0C` | `#10,680,156` | [`0x6a59732e...875e452c`](https://dashboard.qorechain.io/explorer/tx/0x6a59732ede95facde99d0b858a5d32063e6ffd2c9b8f36a956742304875e452c) |
| **Live `0x0901` Cross-VM Sync** | `0x0901` ??? `qday-receipts-w3` | `0x72E4B9507cBd76b9177d61c8a14bd127201EAE0C` | `#10,680,158` | [`0x369d3276...fb6c8b87`](https://dashboard.qorechain.io/explorer/tx/0x369d3276f63d0114433078146402cc936e4f8ef0300d12c5b2668824fb6c8b87) |

* **`TrexPqcIdentityModule.sol` (`0x0A01` + `0x0A02`):** Plug-and-play ERC-3643 `ModularCompliance` module enforcing fail-closed `ML-DSA-87` (`algorithmId == 1`) + `possessionProven == true` gating, ONCHAINID v3 ERC-735 claim attestation checks, and ERC-7930 Cosmos-EVM envelope anchoring.
* **`PqcERC7913Verifier.sol` (`0x0A01` ?? ONCHAINID v3 / ERC-7913):** Stateless `IERC7913SignatureVerifier` returning canonical magic selector `0x024ad318` for valid ML-DSA-87 proofs and `0xffffffff` on invalid/empty/inactive calls, plus `isValidOnchainIdV3Signer(bytes signer, bytes32 hash, bytes signature)` for OpenZeppelin `AccountERC7579` / `SignerERC7913` smart accounts.
* **`TrexCrossVmBridgeModule.sol` (`0x0901` ?? EVM-to-Native CosmWasm):** Atomic cross-VM compliance bridge invoking `0x0901 executeCrossVMCall(1, targetContract, payload)` against Diana's governance-allowlisted CosmWasm receipts contract (`qday-receipts-w3`: `qor1xjayq5ev55tkzpml9klxwyshr7gdrha0nurha9jhm0f0gdckksgs3gltw8`, Proposal 40, Code ID `865`) with JSON-injection-safe ASCII note validation and fail-closed `BridgeNotActive` protection.
* **Security Audit:** Documented in [`./AUDIT_QCAI.md`](./AUDIT_QCAI.md) (Two-Stage Security & QCAI Alignment Audit).

### Sovereign Authority & Relayer Accounts
* **Master Sovereign Node (Trusted Issuer & Agent):** `qor1xkgjactk7qpcqr4arfsgrx5a75g50ne6uwv0qr` / `0x35912ee176F003800eBd1A60819A9Df51147cF3A`
* **Sovereign Owner & Admin:** `qor19y6ah0umdhueq85g9m30xvzrxxeujzcrcqeymm` / `0x2935dbbF9b6DF9901E882Ee2f3304331B3c90B03`
* **Gas Broadcaster (Deployer / Faucet Wallet):** `qor18sp9j6zplpun44zu4ryqdzpq6cs2wc7mrtt9ad` / `0x3C02596841f8793ad45Ca8c8068820d620A763dB`

### Key On-Chain Proof Transactions
* **CH-QOR-01 Bond Deployment:** `0x87750a7b6a5e709589ee0056a5120e45bd68167591af93b22a353d6a6c376067`
* **CH-QOR-01 Institutional Mint & Issuance:** `0xe23052a6e71af2f1cd8f2ac96a7a29af0a306b47f4db5885ce5bf6d06b125771`
* **TrexPqcIdentityModule Deployment (`0x0A01` / `0x0A02`):** `0xc9e9e475ad65ef40c2cff03fc10e562ebd663eda63bc40522e99f01c7488fbfa`
* **PqcERC7913Verifier Deployment (`0x0A01` ERC-7913):** `0xee4c20364dc6978faee1e0f4dc75292e9cd81deb1bf08312eb73d8c125f59041`
* **TrexCrossVmBridgeModule Deployment (`0x0901`):** `0x6a59732ede95facde99d0b858a5d32063e6ffd2c9b8f36a956742304875e452c`
* **Live `0x0901` Cross-VM Identity Sync Receipt (`EVM -> Native`):** `0x369d3276f63d0114433078146402cc936e4f8ef0300d12c5b2668824fb6c8b87`

---

## 3. QoreChain Kits & Open-Source Credits

Built with official QoreChain SDKs, toolkits, and upstream open-source standards:
* **`@qorechain/sdk`** ??? Multi-VM RPC provider & Triple-VM abstraction (`src/services/qorechainPqcService.ts`)
* **`@qorechain/qoresign`** ??? NIST FIPS 204 (`ML-DSA-87`) hybrid EVM window authorization envelope builder
* **`@qorechain/wallet-adapter`** ??? Wallet connection & live address verification
* **`@qorechain/asset-kit`** ??? Regulated RWA `MockChain` pre-flight & ERC-3643 PQC holder validation
* **`@qorechain/qoreseal`** ??? NIST FIPS 203 `ML-KEM-1024` + `AES-256-GCM` selective disclosure encryption
* **`@qorechain/qorescan`** ??? CycloneDX 1.6 CBOM (`cbom.json`) & FINMA Guidance 05/2026 inventory (`FINMA_PQC_REPORT.md`)
* **`@qorechain/pqc`** ??? Core NIST FIPS 203/204 cryptographic primitives
* **Upstream Standards & Libraries:** ERC-3643 T-REX & ONCHAINID v3 (ERC-7579 / ERC-7913 / ERC-7930), OpenZeppelin Contracts (`Ownable2Step`).

---

## 4. Repository Structure

```text
????????? contracts/
???   ????????? TrexPqcIdentityModule.sol       # Gate-1 ERC-3643 PQC module (0x0A01 & 0x0A02)
???   ????????? PqcERC7913Verifier.sol          # ONCHAINID v3 ERC-7913 ML-DSA-87 verifier (0x0A01)
???   ????????? TrexCrossVmBridgeModule.sol     # Atomic 0x0901 EVM-to-Native CosmWasm bridge
???   ????????? MockERC3643.sol                 # SwissQuantumBondToken (CH-QOR-01, 6 decimals)
???   ????????? TREXFactory.sol                 # Deterministic T-REX suite deployer
???   ????????? TREX_Compliance.sol             # ModularCompliance gate evaluator
???   ????????? TrustedIssuersRegistry.sol      # Authorized issuers & topics [100,101,103,105]
???   ????????? TrexToken.sol                   # Reference ERC-3643 permissioned token
???   ????????? mocks/
???   ???   ????????? MockQorePrecompiles.sol     # Local 0x0A01/0x0A02/0x0901 mocks for Hardhat tests
???   ????????? storage/
???       ????????? IdentityRegistryStorage.sol # Investor ONCHAINID & country vault
????????? test/
???   ????????? TrexPqcIdentityModule.test.ts   # Hardhat adversarial tests (5 tests)
???   ????????? OnchainIdV3PqcExtensions.test.ts # ERC-7913 & 0x0901 Cross-VM adversarial tests (7 tests)
????????? scripts/
???   ????????? deployQorechainExtensions.mjs   # Unified Diana 9800 deployer for all 3 extensions
???   ????????? deployTrexPqcModule.mjs         # Single-contract Diana 9800 deployer
???   ????????? verifyLiveState.mjs             # Live bytecode & token metadata probe
???   ????????? testComplianceIntegration.mjs   # Full Gate-1 compliance integration test suite
????????? server/
???   ????????? qorechainProxy.ts               # Express RPC & Diana telemetry relay proxy
????????? src/
???   ????????? services/
???   ???   ????????? qorechainPqcService.ts      # Precompile probes, ERC-7913, 0x0901, QoreSeal & AssetKit
???   ????????? components/
???       ????????? ContractsPage.tsx           # Verified QoreChain Suite Explorer UI
???       ????????? OnchainIdV3EnvelopePanel.tsx # ERC-7930, ERC-7913, 0x0A02 probe & 0x0901 live dispatch UI
???       ????????? QoreChainSovereignPanel.tsx # Sovereign Governance & QoreSeal panel
???       ????????? QoreChainKitsSection.tsx    # Official QoreChain Developer Kits showcase
????????? AUDIT_QCAI.md                       # Two-Stage Security & QCAI Alignment Audit
????????? FINMA_PQC_REPORT.md                 # FINMA Guidance 05/2026 cryptographic inventory
????????? cbom.json                           # CycloneDX 1.6 Cryptographic Bill of Materials
????????? qorechain-deployment.json           # Deployment manifest, tx hashes & contract ABIs
????????? hardhat.config.ts                   # Secret-free Hardhat config (Diana Chain 9800)
????????? AI_USAGE.md                         # AI-Native transparency log
????????? LICENSE                             # MIT License
????????? package.json
```

---

## 5. Run Verification, Hardhat Tests & Deployment

```bash
# 1. Install dependencies
npm install

# 2. Compile contracts & run all 12 adversarial Hardhat tests
npm run compile:contracts
npm test

# 3. Verify live bytecode & CH-QOR-01 token state on QoreChain Diana (Chain ID 9800)
npm run verify:live
npm run verify:compliance

# 4. Regenerate CycloneDX 1.6 CBOM & FINMA Guidance 05/2026 report
npm run scan:cbom

# 5. Deploy all 3 Diana extensions (requires funded .env PRIVATE_KEY with active EVM window)
npm run deploy:qorechain-all

# 5b. Deploy all 3 extensions AND broadcast one live 0x0901 Cross-VM receipt sync tx
npm run deploy:qorechain-all:sync

# 6. Start the local QoreChain RPC proxy relay on port 3000
npm run start:proxy
```
