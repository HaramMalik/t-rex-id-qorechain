# Cryptographic inventory mapped to FINMA Guidance 05/2026

> **Disclaimer.** QoreScan output is an inventory aid. It is not a certification, an audit or a legal opinion, and it does not establish conformity with any regulation or standard. The mapping below shows where the inventory can serve as input; whether an organisation meets a requirement depends on facts outside the scan and is for the organisation and its advisers to assess.

| | |
|---|---|
| CBOM | `urn:uuid:0d4865af-fce3-571f-a480-5d9a8e2b5346` |
| Generated | 2026-11-22T21:43:27Z by qorescan 0.1.0 |
| Chain | `qorechain-diana` |
| Scanned | chain, solidity, tls |

## Framework mapping

| FINMA 05/2026 | Expectation (paraphrased) | What this inventory provides | Status |
|---|---|---|---|
| 3.1 Strategy and roadmap | Strategy adopted by the board, implementation plan with milestones; PQC roadmap by mid-2027 at the latest. | Nothing: organisational measure. | _To be completed._ |
| 3.2 Risk analysis and inventory | Inventory of the cryptographic methods of all ICT systems, including distributed ledger technology, covering transport, stored data, signatures, key management and authentication; identify quantum-vulnerable algorithms. | CBOM with 13 algorithms (7 quantum-vulnerable, 1 post-quantum, 1 hybrid), 1 protocol, 3 certificates, 8 key records. | Input for the scanned scope; other systems and stored data _to be completed._ |
| 3.3 Critical data | Identify data needing long-term protection; consider harvest-now-decrypt-later; hybrid schemes in the short to medium term. | Key exchange of the scanned transports: TLS 1.3 at evm-testnet.qore.host:443: X25519MLKEM768. | Data classification _to be completed._ |
| 3.4 Crypto-agility | Ability to replace algorithms without major architecture changes, as a requirement for systems procured or developed. | Scanned evidence: native-lane hybrid signature mode required; algorithm migration dual-signature period of 1000000 blocks (module parameter). | Evidence listed; assessment _to be completed._ |
| 3.5 External service providers | Plan the migration with providers; make crypto-agility a prerequisite in new outsourcing arrangements. | Scanned TLS endpoints and certificate issuers below; see the vendor questionnaire template (`qorescan template questionnaire`). | _To be completed._ |

## Summary

| Classification | Algorithms |
|---|---|
| post-quantum | 1: ML-DSA-87 |
| hybrid | 1: X25519MLKEM768 |
| quantum-vulnerable | 7: ECDSA P-256, ECDSA P-384, ECDSA secp256k1, ECDSA with SHA-256, ECDSA with SHA-384, Ed25519, RSA PKCS#1 v1.5 with SHA-256 |
| symmetric | 4: AES-128-GCM, HKDF-SHA256, Keccak-256, SHA-256 |

NIST IR 8547 deprecates quantum-vulnerable public-key algorithms (RSA, ECDSA, EdDSA, finite-field and elliptic-curve DH) after 2030 and disallows them under NIST standards after 2035; applications may be given earlier dates.

## Algorithms and status

| Algorithm | Primitive | Parameter set | NIST category | FIPS 203/204/205 | NIST IR 8547 | Evidence |
|---|---|---|---|---|---|---|
| ECDSA P-256 | signature | - | 0 | not covered (quantum-vulnerable) | Deprecated after 2030, disallowed after 2035 (NIST IR 8547) | `evm-testnet.qore.host:443` (+1 more) |
| ECDSA P-384 | signature | - | 0 | not covered (quantum-vulnerable) | Deprecated after 2030, disallowed after 2035 (NIST IR 8547) | `evm-testnet.qore.host:443` |
| ECDSA secp256k1 | signature | - | 0 | not covered (quantum-vulnerable) | Deprecated after 2030, disallowed after 2035 (NIST IR 8547) | `https://api-testnet.qore.host/cosmos/evm/vm/v1/params` (+3 more) |
| ECDSA with SHA-256 | signature | - | 0 | not covered (quantum-vulnerable) | Deprecated after 2030, disallowed after 2035 (NIST IR 8547) | `evm-testnet.qore.host:443` |
| ECDSA with SHA-384 | signature | - | 0 | not covered (quantum-vulnerable) | Deprecated after 2030, disallowed after 2035 (NIST IR 8547) | `evm-testnet.qore.host:443` |
| Ed25519 | signature | - | 0 | not covered (quantum-vulnerable) | Deprecated after 2030, disallowed after 2035 (NIST IR 8547) | `https://api-testnet.qore.host/cosmos/base/tendermint/v1beta1/validatorsets/latest?pagination.limit=1000` |
| RSA PKCS#1 v1.5 with SHA-256 | signature | - | 0 | not covered (quantum-vulnerable) | Deprecated after 2030, disallowed after 2035 (NIST IR 8547) | `evm-testnet.qore.host:443` |
| X25519MLKEM768 | kem | 768 | 3 | hybrid; PQ part per FIPS 203 | Hybrid: post-quantum component approved; classical component deprecated after 2030, disallowed after 2035 (NIST IR 8547) | `evm-testnet.qore.host:443` |
| ML-DSA-87 | signature | 87 | 5 | FIPS 204 | Not scheduled for deprecation by NIST IR 8547 | `PqcERC7913Verifier.sol:23` (+6 more) |
| AES-128-GCM | ae | 128 | 1 | not applicable (symmetric or hash) | Not scheduled for deprecation by NIST IR 8547 | `evm-testnet.qore.host:443` |
| HKDF-SHA256 | kdf | 256 | not defined | not applicable (symmetric or hash) | Not scheduled for deprecation by NIST IR 8547 | `evm-testnet.qore.host:443` |
| Keccak-256 | hash | 256 | not defined | not applicable (symmetric or hash) | Not a NIST-standardised algorithm; not scheduled by NIST IR 8547 | `TrexCrossVmBridgeModule.sol:131` (+5 more) |
| SHA-256 | hash | 256 | 2 | not applicable (symmetric or hash) | Not scheduled for deprecation by NIST IR 8547 | `evm-testnet.qore.host:443` |

## Protocols

| Protocol | Version | Cipher suite | Key exchange | Algorithms |
|---|---|---|---|---|
| TLS 1.3 at evm-testnet.qore.host:443 | 1.3 | TLS_AES_128_GCM_SHA256 | X25519MLKEM768 | X25519MLKEM768, AES-128-GCM, HKDF-SHA256, SHA-256, ECDSA P-256 |

## Certificates

| Certificate | Public key | Signature | Valid until | Chain |
|---|---|---|---|---|
| Certificate WE1 | ECDSA P-256 | ECDSA with SHA-384 | 2029-02-20T14:00:00Z | - |
| Certificate qore.host | ECDSA P-256 | ECDSA with SHA-256 | 2027-01-09T22:24:55Z | verified against the system roots |
| Certificate GTS Root R4 | ECDSA P-384 | RSA PKCS#1 v1.5 with SHA-256 | 2028-01-28T00:00:42Z | - |

## Keys

QoreScan records public keys and key types only; it never reads private key values.

| Key | Type | Algorithm | Count | Evidence |
|---|---|---|---|---|
| Account classical public key qor18sp9j6zplpun44zu4ryqdzpq6cs2wc7mrtt9ad | public-key | ECDSA secp256k1 | - | `https://api-testnet.qore.host/qorechain/pqc/v1/account/qor18sp9j6zplpun44zu4ryqdzpq6cs2wc7mrtt9ad` |
| Account classical public key qor19y6ah0umdhueq85g9m30xvzrxxeujzcrcqeymm | public-key | ECDSA secp256k1 | - | `https://api-testnet.qore.host/qorechain/pqc/v1/account/qor19y6ah0umdhueq85g9m30xvzrxxeujzcrcqeymm` |
| Account PQC public key qor18sp9j6zplpun44zu4ryqdzpq6cs2wc7mrtt9ad | public-key | ML-DSA-87 | - | `https://api-testnet.qore.host/qorechain/pqc/v1/account/qor18sp9j6zplpun44zu4ryqdzpq6cs2wc7mrtt9ad` |
| Account PQC public key qor19y6ah0umdhueq85g9m30xvzrxxeujzcrcqeymm | public-key | ML-DSA-87 | - | `https://api-testnet.qore.host/qorechain/pqc/v1/account/qor19y6ah0umdhueq85g9m30xvzrxxeujzcrcqeymm` |
| Active validator consensus public keys (Ed25519) | public-key | Ed25519 | 4 | `https://api-testnet.qore.host/cosmos/base/tendermint/v1beta1/validatorsets/latest?pagination.limit=1000` |
| Certificate public key (ECDSA P-256) | public-key | ECDSA P-256 | - | `evm-testnet.qore.host:443` |
| Certificate public key (ECDSA P-384) | public-key | ECDSA P-384 | - | `evm-testnet.qore.host:443` |
| Certificate public key (ECDSA P-256) | public-key | ECDSA P-256 | - | `evm-testnet.qore.host:443` |

## Scanned facts

| Fact | Value |
|---|---|
| `chain:account-pqc-status` | qor18sp9j6zplpun44zu4ryqdzpq6cs2wc7mrtt9ad: hybrid key, dilithium5; qor19y6ah0umdhueq85g9m30xvzrxxeujzcrcqeymm: hybrid key, dilithium5; qor1xkgjactk7qpcqr4arfsgrx5a75g50ne6uwv0qr: no PQC key registered |
| `chain:consensus-engine-version` | 0.38.26 |
| `chain:evm:active-precompile` | crossVmBridge (0x0000000000000000000000000000000000000901); rlConsensusParams (0x0000000000000000000000000000000000000C01); pqcVerify (0x0000000000000000000000000000000000000a01); pqcKeyStatus (0x0000000000000000000000000000000000000a02) |
| `chain:id` | qorechain-diana |
| `chain:network` | testnet |
| `chain:pqc:allow-classical-fallback` | false |
| `chain:pqc:default-migration-blocks` | 1000000 |
| `chain:pqc:hybrid-signature-mode` | required |
| `chain:pqc:min-security-level` | 5 |
| `chain:pqc:pqc-primary` | true |
| `chain:protocol-feature` | pqc-sign-bytes-v2; evm-pqc-authorisation-window; pqc-ecdsa-pubkey-validation; pqc-keyed-account-maintenance-hybrid; pqc-registration-integrity; pqc-rotation-replay-guard; pqc-algorithm-governance-guards; pqc-hybrid-single-extension; pqc-keyless-extension-closed; evm-pqc-window-targets; pqc-possession-flag; pqc-kem-registry; pqc-rotate-key-size-check; pqc-verify-once-per-signer; pqc-multisig; pqc-verify-gas-calibrated; pqc-consent-authz-limiter; pqc-consent-outer-signer; pqc-rotation-ends-evm-consent; pqc-degenerate-key-refused; svm-pqc-key-lane-gated; pqc-registration-ends-evm-consent; pqc-consent-own-message; svm-pqc-key-for-wallets; svm-pqc-authorisation-window; qcb-pqc-submitter; pqc-key-change-clears-evm-delegation; pqc-svm-window-key-proof; pqc-registration-ends-svm-window; pqc-hybrid-embedded-key-degenerate; qcb-pqc-submitter-own-message |
| `chain:protocol-features` | 341 enabled at height 10577035 (31 PQC-related listed) |
| `chain:rest` | https://api-testnet.qore.host |

## Scan notes

- [info] chain: account qor1xkgjactk7qpcqr4arfsgrx5a75g50ne6uwv0qr has no registered PQC key (https://api-testnet.qore.host/qorechain/pqc/v1/account/qor1xkgjactk7qpcqr4arfsgrx5a75g50ne6uwv0qr)

## Sources

- FINMA Guidance 05/2026 "Quantum computing", 9 July 2026: <https://www.finma.ch/en/~/media/finma/dokumente/dokumentencenter/myfinma/4dokumentation/finma-aufsichtsmitteilungen/20260709-finma-aufsichtsmitteilung-05-2026.pdf>
- NIST IR 8547, "Transition to Post-Quantum Cryptography Standards", final, October 2026: <https://doi.org/10.6028/NIST.IR.8547>
- FIPS 203, Module-Lattice-Based Key-Encapsulation Mechanism Standard: <https://csrc.nist.gov/pubs/fips/203/final>
- FIPS 204, Module-Lattice-Based Digital Signature Standard: <https://csrc.nist.gov/pubs/fips/204/final>
- FIPS 205, Stateless Hash-Based Digital Signature Standard: <https://csrc.nist.gov/pubs/fips/205/final>

The framework rows paraphrase the source documents; read the sources for the authoritative wording.
