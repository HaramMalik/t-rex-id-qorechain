# Two-Stage Smart Contract Security & QCAI Alignment Audit

**Project:** T-REX ID: Quantum-Safe ERC-3643 Institutional Identity (`t-rex-id-qorechain`)  
**Target Network:** QoreChain Diana Testnet (EVM Chain ID `9800`, Cosmos `qorechain-diana`)  
**Scope:** `TrexPqcIdentityModule.sol`, `PqcERC7913Verifier.sol`, `TrexCrossVmBridgeModule.sol`, `MockERC3643.sol`, `TREX_Compliance.sol`, `TrustedIssuersRegistry.sol`, `TREXFactory.sol`, `IdentityRegistryStorage.sol`, and `@qorechain/qorescan` cryptographic inventory (`cbom.json`, `FINMA_PQC_REPORT.md`).

---

## Stage 1: Initial Vulnerability Review & Adversarial Findings

During Stage 1 static review and precompile ABI verification against QoreChain's EVM runtime (`0x0A01` `pqcVerify`, `0x0A02` `pqcKeyStatus`, `0x0901` `executeCrossVMCall`), seven institutional security risks were identified:

1. **[HIGH] Unchecked Precompile Return Payload / Fail-Open Risk**  
   *Risk:* Calling an unactivated or empty precompile address (`0x0A01` / `0x0A02` / `0x0901`) via EVM `staticcall`/`call` succeeds with `ok = true` and `0` return bytes on networks where the precompile is absent. Calling `abi.decode` directly would revert or risk misinterpreting unverified holders or silent Cross-VM no-ops.  
   *Affected Components:* `TrexPqcIdentityModule.sol`, `PqcERC7913Verifier.sol`, `TrexCrossVmBridgeModule.sol`.

2. **[HIGH] Incomplete Key Registration Without Proof-of-Possession**  
   *Risk:* QoreChain `0x0A02 pqcKeyStatus(address)` distinguishes `registered == true` from `possessionProven == true` (observed live on `0x2935dbbf9b6DF9901E882Ee2f3304331B3c90B03`, where `registered = true` and `possessionProven = false`). Accepting keys without `possessionProven == true` or non-`ML-DSA-87` algorithm IDs would bypass NIST FIPS 204 protection.  
   *Affected Component:* `TrexPqcIdentityModule.sol` (`isHybridHolder`, `moduleCheck`, `verifyOnchainIdClaimPqc`, `anchorErc7930Envelope`).

3. **[HIGH] Cross-VM CosmWasm JSON Injection & Unallowlisted Target Risk (`0x0901`)**  
   *Risk:* Building UTF-8 JSON CosmWasm execute payloads (`{"record":{"note":"..."}}`) from untrusted `cosmosBech32` strings without strict ASCII sanitization permits JSON structure breakout via `"` (`0x22`) or `\` (`0x5C`), and calling `0x0901` on networks without active bytecode returns `ok = true, ret.length == 0`.  
   *Affected Component:* `TrexCrossVmBridgeModule.sol` (`dispatchIdentitySync`, `_callNativeBridge`, `_validateSafeAscii`).

4. **[MEDIUM] ERC-3643 Exemption & Custody Vault Deadlock**  
   *Risk:* Smart-contract custody vaults cannot hold native ML-DSA-87 user keys, while investors must never be trapped unable to redeem/burn tokens (`to == address(0)`). Additionally, exempt custody contracts must still satisfy ERC-3643 `IdentityRegistry.isVerified(_to)`.  
   *Affected Component:* `TrexPqcIdentityModule.sol` (`moduleCheck`).

5. **[MEDIUM] ERC-7913 Packed Signer Truncation & Non-Standard Selector Returns**  
   *Risk:* OpenZeppelin `AccountERC7579` / `SignerERC7913` expects `verify(bytes,bytes32,bytes)` to return exact selector `0x024ad318` on valid proofs and `0xffffffff` on invalid/empty inputs without reverting. Passing truncated `signer` bytes (`<= 20` bytes) to `isValidOnchainIdV3Signer` could cause out-of-bounds slicing panics if unchecked.  
   *Affected Component:* `PqcERC7913Verifier.sol` (`verify`, `isValidOnchainIdV3Signer`).

6. **[MEDIUM] Single-Step Ownership Transfer Risk**  
   *Risk:* Single-step `Ownable.transferOwnership` risks permanent governance loss on key typo for sovereign issuer exemptions, registry binding, and native CosmWasm target updates.  
   *Affected Components:* `TrexPqcIdentityModule.sol`, `TrexCrossVmBridgeModule.sol`.

7. **[LOW] Unauthorized ERC-7930 Cross-VM Envelope Anchoring & Solidity EIP-55 Literal Syntax**  
   *Risk:* Permitting third parties to overwrite another institution's Cosmos `qor1...` ??? EVM `0x...` identity mapping violates ONCHAINID v3 self-sovereignty. Additionally, uppercase `0x...0A01` 40-char literals trigger solc EIP-55 checksum compiler errors.  
   *Affected Components:* `TrexPqcIdentityModule.sol`, `PqcERC7913Verifier.sol`, `TrexCrossVmBridgeModule.sol`.

---

## Remediation Summary Applied Before Stage 2

| Finding | Remediation Implemented | Verified In |
| :--- | :--- | :--- |
| **#1 Fail-Closed Precompile Guard** | Enforced `if (!ok \|\| raw.length < 160)` for `0x0A02`, `if (!ok \|\| raw.length < 32)` for `0x0A01`, and `if (ret.length == 0) revert BridgeNotActive()` for `0x0901`. | `TrexPqcIdentityModule.sol`, `PqcERC7913Verifier.sol`, `TrexCrossVmBridgeModule.sol` |
| **#2 Strict ML-DSA-87 + PoP Gate** | Required `responded && registered && algorithmId == 1 && possessionProven && pubkey.length > 0` across transfers, ONCHAINID ERC-735 claims, and ERC-7930 anchors. | `TrexPqcIdentityModule.sol` L200-272 |
| **#3 Cross-VM JSON Sanitization** | Enforced printable ASCII `0x20..0x7E` rejecting `"` (`0x22`) and `\` (`0x5C`) plus max 140-byte note limit; gated raw `dispatchCustomCompliancePayload` with `onlyOwner`. | `TrexCrossVmBridgeModule.sol` L102-157, L236-246 |
| **#4 Redemption & Custody Safety** | Allowed burns (`_to == address(0)`); ordered `identityRegistry.isVerified(_to)` BEFORE `isExempt[_to]` so exempt vaults still obey T-REX KYC. | `TrexPqcIdentityModule.sol` L122-145 |
| **#5 ERC-7913 Strict Compliance** | Returned exact `0x024ad318` / `0xffffffff` with empty-input and `signer.length <= 20` guards so `AccountERC7579` never encounters slicing panics. | `PqcERC7913Verifier.sol` L35-104 |
| **#6 Two-Step Ownership** | Inherited OpenZeppelin `Ownable2Step` for owner-gated controls across both `TrexPqcIdentityModule` and `TrexCrossVmBridgeModule`. | `TrexPqcIdentityModule.sol` L30, `TrexCrossVmBridgeModule.sol` L29 |
| **#7 Anchor Auth & Address Literals** | Restricted `anchorErc7930Envelope` to `msg.sender == evmAccount \|\| msg.sender == owner()`, validated `identityRole <= 7`, and used checksum-safe `address(0x0A01)`, `address(0x0A02)`, `address(0x0901)`. | All 3 extension contracts |

---

## Stage 2: Re-Verification & Empirical Evidence

1. **Solidity Compilation (`solc 0.8.24`, Cancun EVM):**  
   Clean zero-warning build for all three QoreChain extension contracts with `optimizer: 200` and `viaIR: true`.

2. **Automated Hardhat Adversarial Test Suite (12 / 12 Passing):**
   - **`test/TrexPqcIdentityModule.test.ts` (5 tests):** Compliance binding (`OnlyComplianceCanBind` / `ComplianceNotBound`), `0x0A02` ML-DSA-87 + `possessionProven` transfer gating, fail-closed checks on non-ML-DSA-87 / absent `0x0A02`, ONCHAINID v3 ERC-735 claim verification (`0x0A02` + `0x0A01`), and authorized ERC-7930 anchoring.
   - **`test/OnchainIdV3PqcExtensions.test.ts` (7 tests):**
     - `PqcERC7913Verifier`: canonical `0x024ad318` magic return on valid `0x0A01` proof vs `0xffffffff` on tampered digest, empty `key`/`signature`, and absent `0x0A01` bytecode; `isValidOnchainIdV3Signer` packed `abi.encodePacked(verifier, pubkey)` validation and truncated-signer rejection.
     - `TrexCrossVmBridgeModule`: atomic `0x0901 executeCrossVMCall(1, qday-receipts-w3, jsonPayload)` dispatch and event emission, JSON injection (`"` / `\`) and invalid role (`> 7`) rejection, optional ERC-3643 `IdentityRegistry.isVerified` gating, `onlyOwner` guard on custom payloads, and fail-closed `BridgeCallFailed` / `BridgeNotActive` reverts.

3. **QoreScan Cryptographic Bill of Materials (`cbom.json` & `FINMA_PQC_REPORT.md`):**
   - Generated against live `qorechain-diana` REST & RPC endpoints (`@qorechain/qorescan v0.1.0`).
   - Verified TLS 1.3 `X25519MLKEM768` transport on `evm-testnet.qore.host:443`.
   - Verified live on-chain `dilithium5` / `ML-DSA-87` hybrid keys for Sovereign Owner & Gas Broadcaster accounts and confirmed `ML-DSA-87` static analysis matches across all QoreChain PQC Solidity modules.

4. **Security Hygiene & Key Isolation Audit:**
   - All deployment and verification scripts (`deployTrexPqcModule.mjs`, `deployQorechainExtensions.mjs`) read signing keys strictly from `.env` (`process.env.PRIVATE_KEY`); zero hardcoded private keys or secret tokens exist in `qorechain-opensource/`.
