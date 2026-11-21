// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable2Step.sol";

interface ITrexIdentityRegistry {
    function isVerified(address _userAddress) external view returns (bool);
}

/// @title IERC3643ComplianceModule
/// @notice Standard ERC-3643 ModularCompliance pluggable module interface.
interface IERC3643ComplianceModule {
    function bindCompliance(address _compliance) external;
    function unbindCompliance(address _compliance) external;
    function moduleTransferAction(address _from, address _to, uint256 _value) external;
    function moduleMintAction(address _to, uint256 _value) external;
    function moduleBurnAction(address _from, uint256 _value) external;
    function moduleCheck(
        address _from,
        address _to,
        uint256 _value,
        address _compliance
    ) external view returns (bool);
    function isComplianceBound(address _compliance) external view returns (bool);
    function canComplianceBind(address _compliance) external view returns (bool);
    function isPlugAndPlay() external pure returns (bool);
    function name() external pure returns (string memory);
}

/// @title TrexPqcIdentityModule
/// @notice Quantum-safe ERC-3643 ModularCompliance module & ONCHAINID v3 ERC-7930 anchor
///         utilizing QoreChain Diana Testnet native precompiles:
///         - 0x0A01: pqcVerify(bytes pubkey, bytes signature, bytes message)
///         - 0x0A02: pqcKeyStatus(address account)
/// @dev Strictly fail-closed: unactivated precompiles, short ABI payloads, non-ML-DSA-87 keys,
///      or keys without proof-of-possession evaluate to false.
contract TrexPqcIdentityModule is IERC3643ComplianceModule, Ownable2Step {
    /// @notice QoreChain native NIST FIPS 204 ML-DSA-87 signature verification precompile.
    address public constant PQC_VERIFY_PRECOMPILE = address(0x0A01);

    /// @notice QoreChain native PQC key registration & possession status precompile.
    address public constant PQC_KEY_STATUS_PRECOMPILE = address(0x0A02);

    /// @notice Canonical QoreChain algorithm identifier for ML-DSA-87 (Dilithium5).
    uint8 public constant ML_DSA_87_ALG_ID = 1;

    struct Erc7930Envelope {
        string cosmosBech32;
        bytes32 keyspaceDigest;
        uint8 identityRole;
        uint64 anchoredAt;
        bool pqcVerified;
    }

    ITrexIdentityRegistry public identityRegistry;

    mapping(address => bool) private _complianceBound;
    mapping(address => bool) public isExempt;
    mapping(address => Erc7930Envelope) private _envelopes;

    event ComplianceBound(address indexed compliance);
    event ComplianceUnbound(address indexed compliance);
    event ExemptUpdated(address indexed account, bool exempt, string reason);
    event IdentityRegistryUpdated(address indexed previousRegistry, address indexed newRegistry);
    event Erc7930EnvelopeAnchored(
        address indexed evmAccount,
        string cosmosBech32,
        bytes32 keyspaceDigest,
        uint8 identityRole,
        bool pqcVerified
    );

    error ZeroAddress();
    error OnlyComplianceCanBind();
    error ComplianceAlreadyBound();
    error ComplianceNotBound();
    error UnauthorizedEnvelopeAnchor();
    error InvalidIdentityRole();
    error NoPqcKeyRegistered();
    error PqcProofInvalid();

    modifier onlyBoundCompliance() {
        if (!_complianceBound[msg.sender]) revert ComplianceNotBound();
        _;
    }

    constructor(address initialOwner, address _identityRegistry) Ownable(initialOwner) {
        if (initialOwner == address(0)) revert ZeroAddress();
        identityRegistry = ITrexIdentityRegistry(_identityRegistry);
    }

    // =========================================================================
    // ERC-3643 ModularCompliance Interface
    // =========================================================================

    function bindCompliance(address _compliance) external override {
        if (_compliance == address(0)) revert ZeroAddress();
        if (msg.sender != _compliance) revert OnlyComplianceCanBind();
        if (_complianceBound[_compliance]) revert ComplianceAlreadyBound();
        _complianceBound[_compliance] = true;
        emit ComplianceBound(_compliance);
    }

    function unbindCompliance(address _compliance) external override {
        if (!_complianceBound[_compliance]) revert ComplianceNotBound();
        if (msg.sender != _compliance && msg.sender != owner()) revert ComplianceNotBound();
        _complianceBound[_compliance] = false;
        emit ComplianceUnbound(_compliance);
    }

    function moduleTransferAction(address, address, uint256) external view override onlyBoundCompliance {
        // State-free policy module; eligibility enforced in moduleCheck.
    }

    function moduleMintAction(address, uint256) external view override onlyBoundCompliance {
        // Minting eligibility enforced via moduleCheck(address(0), to, value, compliance).
    }

    function moduleBurnAction(address, uint256) external view override onlyBoundCompliance {
        // Redemptions/burns always permitted.
    }

    /// @notice Gate-1 post-quantum compliance check invoked by ERC-3643 ModularCompliance.
    function moduleCheck(
        address,
        address _to,
        uint256,
        address
    ) external view override returns (bool) {
        // Always permit token burns / redemptions so investors can exit positions.
        if (_to == address(0)) {
            return true;
        }

        // Enforce standard ERC-3643 KYC/AML verification when IdentityRegistry is bound.
        if (address(identityRegistry) != address(0)) {
            if (!identityRegistry.isVerified(_to)) {
                return false;
            }
        }

        // Qualified custody vaults / system contracts may be explicitly exempted by sovereign owner.
        if (isExempt[_to]) {
            return true;
        }

        // Require live NIST FIPS 204 ML-DSA-87 hybrid key with proof-of-possession via 0x0A02.
        return isHybridHolder(_to);
    }

    function isComplianceBound(address _compliance) external view override returns (bool) {
        return _complianceBound[_compliance];
    }

    function canComplianceBind(address _compliance) external pure override returns (bool) {
        return _compliance != address(0);
    }

    function isPlugAndPlay() external pure override returns (bool) {
        return true;
    }

    function name() external pure override returns (string memory) {
        return "TrexPqcIdentityModule";
    }

    // =========================================================================
    // Sovereign Governance Controls
    // =========================================================================

    function setExempt(address account, bool exempt, string calldata reason) external onlyOwner {
        if (account == address(0)) revert ZeroAddress();
        isExempt[account] = exempt;
        emit ExemptUpdated(account, exempt, reason);
    }

    function setIdentityRegistry(address _identityRegistry) external onlyOwner {
        address prev = address(identityRegistry);
        identityRegistry = ITrexIdentityRegistry(_identityRegistry);
        emit IdentityRegistryUpdated(prev, _identityRegistry);
    }

    // =========================================================================
    // QoreChain 0x0A01 & 0x0A02 Precompile Verification
    // =========================================================================

    /// @notice Probes whether the 0x0A02 pqcKeyStatus precompile responds with a valid 5-word ABI payload.
    function precompileActive() public view returns (bool) {
        (bool ok, bytes memory raw) = PQC_KEY_STATUS_PRECOMPILE.staticcall(
            abi.encodeWithSignature("pqcKeyStatus(address)", address(0))
        );
        return ok && raw.length >= 160;
    }

    /// @notice Decodes 0x0A02 pqcKeyStatus(address) strictly failing closed on malformed/short data.
    function decodeKeyStatus(
        address account
    )
        public
        view
        returns (
            bool responded,
            bool registered,
            uint8 algorithmId,
            bytes memory pubkey,
            bool possessionProven
        )
    {
        (bool ok, bytes memory raw) = PQC_KEY_STATUS_PRECOMPILE.staticcall(
            abi.encodeWithSignature("pqcKeyStatus(address)", account)
        );
        if (!ok || raw.length < 160) {
            return (false, false, 0, "", false);
        }
        (registered, algorithmId, pubkey, possessionProven) = abi.decode(
            raw,
            (bool, uint8, bytes, bool)
        );
        return (true, registered, algorithmId, pubkey, possessionProven);
    }

    function keyStatus(
        address account
    ) external view returns (bool responded, bool registered, uint8 algorithmId, bool possessionProven) {
        (responded, registered, algorithmId, , possessionProven) = decodeKeyStatus(account);
    }

    /// @notice Returns true only if `account` has an ML-DSA-87 key registered with proof-of-possession.
    function isHybridHolder(address account) public view returns (bool) {
        (
            bool responded,
            bool registered,
            uint8 algorithmId,
            bytes memory pubkey,
            bool possessionProven
        ) = decodeKeyStatus(account);
        return responded && registered && algorithmId == ML_DSA_87_ALG_ID && possessionProven && pubkey.length > 0;
    }

    /// @notice Direct wrapper over QoreChain 0x0A01 pqcVerify(bytes pubkey, bytes signature, bytes message).
    function verifyDirectPqcSignature(
        bytes memory pubkey,
        bytes memory signature,
        bytes memory message
    ) public view returns (bool) {
        if (pubkey.length == 0 || signature.length == 0) {
            return false;
        }
        (bool ok, bytes memory raw) = PQC_VERIFY_PRECOMPILE.staticcall(
            abi.encodeWithSignature("pqcVerify(bytes,bytes,bytes)", pubkey, signature, message)
        );
        if (!ok || raw.length < 32) {
            return false;
        }
        return abi.decode(raw, (bool));
    }

    /// @notice Verifies an ONCHAINID v3 ERC-735 claim attestation signed by a Trusted Issuer's ML-DSA-87 key.
    function verifyOnchainIdClaimPqc(
        address issuer,
        uint256 topic,
        address subject,
        bytes calldata claimData,
        bytes calldata mlDsaSignature
    ) external view returns (bool) {
        (
            bool responded,
            bool registered,
            uint8 algorithmId,
            bytes memory pubkey,
            bool possessionProven
        ) = decodeKeyStatus(issuer);

        if (!responded || !registered || algorithmId != ML_DSA_87_ALG_ID || !possessionProven || pubkey.length == 0) {
            return false;
        }

        bytes32 claimDigest = keccak256(abi.encodePacked(subject, topic, claimData));
        return verifyDirectPqcSignature(pubkey, mlDsaSignature, abi.encodePacked(claimDigest));
    }

    // =========================================================================
    // ONCHAINID v3 ERC-7930 Interoperable Address Anchor
    // =========================================================================

    /// @notice Anchors an EVM (`0x`) <-> Cosmos (`qor1`) ONCHAINID v3 envelope after verifying ML-DSA-87 proof via 0x0A01.
    function anchorErc7930Envelope(
        address evmAccount,
        string calldata cosmosBech32,
        bytes32 keyspaceDigest,
        uint8 identityRole,
        bytes calldata mlDsaSignature
    ) external {
        if (evmAccount == address(0)) revert ZeroAddress();
        if (msg.sender != evmAccount && msg.sender != owner()) revert UnauthorizedEnvelopeAnchor();
        if (identityRole > 7) revert InvalidIdentityRole();

        (
            bool responded,
            bool registered,
            uint8 algorithmId,
            bytes memory pubkey,
            bool possessionProven
        ) = decodeKeyStatus(evmAccount);

        if (!responded || !registered || algorithmId != ML_DSA_87_ALG_ID || !possessionProven || pubkey.length == 0) {
            revert NoPqcKeyRegistered();
        }

        bytes memory payload = abi.encodePacked(evmAccount, cosmosBech32, keyspaceDigest);
        if (!verifyDirectPqcSignature(pubkey, mlDsaSignature, payload)) {
            revert PqcProofInvalid();
        }

        _envelopes[evmAccount] = Erc7930Envelope({
            cosmosBech32: cosmosBech32,
            keyspaceDigest: keyspaceDigest,
            identityRole: identityRole,
            anchoredAt: uint64(block.timestamp),
            pqcVerified: true
        });

        emit Erc7930EnvelopeAnchored(evmAccount, cosmosBech32, keyspaceDigest, identityRole, true);
    }

    function getErc7930Envelope(address evmAccount) external view returns (Erc7930Envelope memory) {
        return _envelopes[evmAccount];
    }
}
