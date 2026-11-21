# Two-Stage Smart Contract Security & QCAI Alignment Audit

**Project:** T-REX ID: Quantum-Safe ERC-3643 Institutional Identity (`t-rex-id-qorechain`)  
**Target Network:** QoreChain Diana Testnet (EVM Chain ID `9800`, Cosmos `qorechain-diana`)  
**Scope:** `TrexPqcIdentityModule.sol`, `MockERC3643.sol`, `TREX_Compliance.sol`, `TrustedIssuersRegistry.sol`, `TREXFactory.sol`, `IdentityRegistryStorage.sol`, and `@qorechain/qorescan` cryptographic inventory (`cbom.json`, `FINMA_PQC_REPORT.md`).

---

## Stage 1: Initial Vulnerability Review & Adversarial Findings

During Stage 1 static review and precompile ABI verification against QoreChain's EVM runtime (`0x0A01` `pqcVerify`, `0x0A02` `pqcKeyStatus`), five institutional security risks were identified:

1. **[HIGH] Unchecked Precompile Return Payload / Fail-Open Risk**  
   *Risk:* Calling an unactivated or empty precompile address (`0x0A01` / `0x0A02`) via EVM `staticcall` succeeds with `ok = true` and `0` return bytes on networks where the precompile is absent. Calling `abi.decode` directly would revert or risk misinterpreting unverified holders.  
   *Affected Component:* `TrexPqcIdentityModule.sol` (`decodeKeyStatus`, `verifyDirectPqcSignature`).

2. **[HIGH] Incomplete Key Registration Without Proof-of-Possession**  
   *Risk:* QoreChain `0x0A02 pqcKeyStatus(address)` distinguishes `registered == true` from `possessionProven == true` (observed live on `0x2935dbbf9b6DF9901E882Ee2f3304331B3c90B03`, where `registered = true` and `possessionProven = false`). Accepting keys without `possessionProven == true` or non-`ML-DSA-87` algorithm IDs would bypass NIST FIPS 204 protection.  
   *Affected Component:* `TrexPqcIdentityModule.sol` (`isHybridHolder`, `moduleCheck`, `verifyOnchainIdClaimPqc`, `anchorErc7930Envelope`).

3. **[MEDIUM] ERC-3643 Exemption & Custody Vault Deadlock**  
   *Risk:* Smart-contract custody vaults cannot hold native ML-DSA-87 user keys, while investors must never be trapped unable to redeem/burn tokens (`to == address(0)`). Additionally, exempt custody contracts must still satisfy ERC-3643 `IdentityRegistry.isVerified(_to)`.  
   *Affected Component:* `TrexPqcIdentityModule.sol` (`moduleCheck`).

4. **[MEDIUM] Single-Step Ownership Transfer Risk**  
   *Risk:* Single-step `Ownable.transferOwnership` risks permanent governance loss on key typo for sovereign issuer exemptions and registry binding.  
   *Affected Component:* `TrexPqcIdentityModule.sol` governance inheritance.

5. **[LOW] Unauthorized ERC-7930 Cross-VM Envelope Anchoring & Solidity EIP-55 Literal Syntax**  
   *Risk:* Permitting third parties to overwrite another institution's Cosmos `qor1...` ↔ EVM `0x...` identity mapping violates ONCHAINID v3 self-sovereignty. Additionally, uppercase `0x...0A01` 40-char literals trigger solc EIP-55 checksum compiler errors.  
   *Affected Component:* `TrexPqcIdentityModule.sol` (`anchorErc7930Envelope`, precompile constants).

---

## Remediation Summary Applied Before Stage 2

| Finding | Remediation Implemented | Verified In |
| :--- | :--- | :--- |
| **#1 Fail-Closed Precompile Guard** | Enforced `if (!ok \|\| raw.length < 160)` for `0x0A02` (5-word ABI minimum) and `if (!ok \|\| raw.length < 32)` for `0x0A01`; added `precompileActive()` health check returning `false` on `0x` runtime code. | `TrexPqcIdentityModule.sol` L162-215 |
| **#2 Strict ML-DSA-87 + PoP Gate** | Required `responded && registered && algorithmId == 1 && possessionProven && pubkey.length > 0` across transfers, ONCHAINID ERC-735 claims, and ERC-7930 anchors. | `TrexPqcIdentityModule.sol` L200-272 |
| **#3 Redemption & Custody Safety** | Allowed burns (`_to == address(0)`); ordered `identityRegistry.isVerified(_to)` BEFORE `isExempt[_to]` so exempt vaults still obey T-REX KYC. | `TrexPqcIdentityModule.sol` L122-145 |
| **#4 Two-Step Ownership** | Inherited OpenZeppelin `Ownable2Step` for owner-gated `setExempt` and `setIdentityRegistry`. | `TrexPqcIdentityModule.sol` L4 & L30 |
| **#5 Anchor Auth & Address Literals** | Restricted `anchorErc7930Envelope` to `msg.sender == evmAccount \|\| msg.sender == owner()`, validated `identityRole <= 7`, and used checksum-safe `address(0x0A01)` / `address(0x0A02)`. | `TrexPqcIdentityModule.sol` L250-284 |

---

## Stage 2: Re-Verification & Empirical Evidence

1. **Solidity Compilation (`solc 0.8.24`, Cancun EVM):**  
   Clean zero-warning build with `optimizer: 200` and `viaIR: true`.

2. **Automated Hardhat Adversarial Test Suite (`test/TrexPqcIdentityModule.test.ts`):**
   - Compliance binding authorization (`OnlyComplianceCanBind` & `ComplianceNotBound`).
   - Transfer gating against `0x0A02 pqcKeyStatus` (blocks registered-only accounts lacking `possessionProven`, blocks unverified recipients, allows verified exempt custody vaults, allows zero-address redemptions).
   - Fail-closed guarantees on non-ML-DSA-87 algorithm IDs (`algorithmId == 2`) and unactivated precompile bytecode (`setCode(0x0A02, "0x")`).
   - End-to-end ONCHAINID v3 ERC-735 claim verification combining `0x0A02` issuer lookup + `0x0A01 pqcVerify` signature proof (rejects tampered claims).
   - ONCHAINID v3 ERC-7930 Cosmos-EVM envelope anchoring authorization (`UnauthorizedEnvelopeAnchor` guard) and `0x0A01` verification.

3. **QoreScan Cryptographic Bill of Materials (`cbom.json` & `FINMA_PQC_REPORT.md`):**
   - Generated against live `qorechain-diana` REST & RPC endpoints (`@qorechain/qorescan v0.1.0`).
   - Verified TLS 1.3 `X25519MLKEM768` transport on `evm-testnet.qore.host:443`.
   - Verified live on-chain `dilithium5` / `ML-DSA-87` hybrid keys for Sovereign Owner & Gas Broadcaster accounts and confirmed `ML-DSA-87` static analysis match in `TrexPqcIdentityModule.sol`.

4. **Security Hygiene & Key Isolation Audit:**
   - All deployment and verification scripts read signing keys strictly from `.env` (`process.env.PRIVATE_KEY`); zero hardcoded private keys or secret tokens exist in `qorechain-opensource/`.
