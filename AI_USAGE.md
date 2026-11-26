# AI_USAGE.md ??? T-REX ID on QoreChain (Public Integration Repository)

## Overview
This document satisfies the **AI-Native** bounty requirements for **Build Before Q-Day (QoreChain Developer Fest)** by detailing how Artificial Intelligence tooling was used across the design, smart contract synthesis, and verification of **T-REX ID's QoreChain Diana integration**.

---

## 1. AI Tooling & Models Used
- **Primary AI Engine:** Google Gemini 2.5 / 3.0 Pro & Flash via Google AI Studio Build
- **Automated Workflows:**
  - ERC-3643 Smart Contract Audit & Compliance Matrix Synthesis
  - Post-Quantum Cryptographic Envelope & Triple-VM Bech32 Alignment
  - Live On-Chain Verification & Smoke-Testing Runners

---

## 2. Technical Areas Powered by AI

### A. ERC-3643 Smart Contract Suite Architecture
- Adapted the ERC-3643 (T-REX standard) suite for QoreChain Diana Testnet (Chain ID: `9800`).
- Verified regulatory claim topics enforced on `TrustedIssuersRegistry`:
  - **Topic 100:** KYC Statutory Legal Clearance
  - **Topic 101:** AML / Anti-Financial Crime Clearance
  - **Topic 103:** Swiss DLT Act / Cross-Border Suitability (`CH`)
  - **Topic 105:** Qualified Institutional Buyer (QIB) / Accredited Investor

### B. NIST FIPS 203 & 204 Lattice Cryptography Enveloping
- Synthesized `/qorechain.evm.v1.MsgOpenEVMWindow` signing payloads combining ECDSA `secp256k1` with NIST FIPS 204 (`ML-DSA-87` / Dilithium) and NIST FIPS 203 (`ML-KEM-1024`) security metadata.
- Added Cosmos Bech32 (`qor1...`) and EVM (`0x...`) cross-representation verification across all deployed sovereign roles and contracts.

### C. Live On-Chain Verification (`scripts/verifyLiveState.mjs` & `scripts/testComplianceIntegration.mjs`)
- Read-only verification scripts assert live contract bytecode, ownership (`0x2935dbbF9b6DF9901E882Ee2f3304331B3c90B03`), `TrustedIssuersRegistry` topics `[100, 101, 103, 105]`, `ModularCompliance` gating, and `SwissQuantumBondToken` (`CH-QOR-01`, 6 decimals) bindings across all 5 live contracts:
  1. `IdentityRegistryStorage`: `0x174b948095D6D6d4692C1187977AE26bceB973c9` (`qor1za9efqy46mtdg6fvzxrew7hzd08tju7fsc8t79`)
  2. `TrustedIssuersRegistry`: `0x1cd4A4FDe8f5189aEeFD88F00621c0410BE42EFb` (`qor1rn22fl0g75vf4mha3rcqvgwqgy97gthml34fee`)
  3. `ModularCompliance`: `0xA5E22734a86f4099EEA5e3ed03C818149ebbD546` (`qor15h3zwd9gdaqfnm49u0ks8jqczj0th42xdalqat`)
  4. `TREXFactory`: `0x110e9080FcB2DC0025262eD6eD213dc17dB6454E` (`qor1zy8fpq8uktwqqffx9mtw6gfac97mv32w869yvz`)
  5. `SwissQuantumBondToken`: `0x6A9ca1D10c054C5aE9f5F597c7662083110a9834` (`qor1d2w2r5gvq4x946047ktuwe3qsvgs4xp5w9fzs2`)

### D. Resilient Node Proxy & Contracts Vault UI
- Built `/api/qorechain/rpc` and `/api/qorechain/telemetry` server relays (`server/qorechainProxy.ts`) and the interactive `ContractsPage` + `QoreChainKitsSection` React components to probe live bytecode and link directly to verified explorer contracts without exposing RPC credentials or private keys.

---

## 3. Human-in-the-Loop Oversight & Open-Source Boundary
- All sovereign authority addresses, constructor ownership bindings, token decimals, and compliance invariants were reviewed and approved by the developer team.
- This repository open-sources the complete QoreChain Diana integration, Solidity smart contracts, verification suite, and UI components under the **MIT License**, while keeping unrelated private T-REX ID core infrastructure in a separate private repository.
