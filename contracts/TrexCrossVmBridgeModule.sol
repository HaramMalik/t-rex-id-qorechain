// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable2Step.sol";

interface ITrexIdentityRegistryCrossVm {
    function isVerified(address _userAddress) external view returns (bool);
}

/// @title ICrossVmBridge
/// @notice QoreChain Diana Testnet synchronous EVM-to-Native Cross-VM precompile at 0x0901.
interface ICrossVmBridge {
    /// @param targetVM 1 for QoreChain Native (CosmWasm).
    /// @param targetContract Governance-allowlisted Native `qor1...` contract address.
    /// @param payload UTF-8 JSON CosmWasm execute message.
    function executeCrossVMCall(
        uint8 targetVM,
        string calldata targetContract,
        bytes calldata payload
    ) external returns (bytes memory);
}

/// @title TrexCrossVmBridgeModule
/// @notice Atomic EVM-to-Native Cross-VM compliance bridge adapter for T-REX ID (ERC-3643 + ONCHAINID v3).
///         Calls QoreChain Diana's native Cross-VM bridge precompile at 0x0901 (`executeCrossVMCall`)
///         to anchor ERC-7930 institutional identity & compliance receipts on QoreChain Native (CosmWasm)
///         in the exact same block/transaction. Strictly fail-closed: reverts if the precompile is inactive,
///         returns empty bytes, or rejects the target contract.
contract TrexCrossVmBridgeModule is Ownable2Step {
    /// @notice QoreChain native synchronous EVM-to-Native Cross-VM bridge precompile.
    address public constant CROSS_VM_BRIDGE_PRECOMPILE = address(0x0901);

    /// @notice Target VM identifier for QoreChain Native (CosmWasm).
    uint8 public constant TARGET_VM_NATIVE = 1;

    /// @notice Default governance-allowlisted CosmWasm receipts contract on Diana Testnet
    ///         (Proposal 40, Code ID 865, immutable / no admin: `qday-receipts-w3`).
    string public constant DEFAULT_NATIVE_RECEIPTS_CONTRACT =
        "qor1xjayq5ev55tkzpml9klxwyshr7gdrha0nurha9jhm0f0gdckksgs3gltw8";

    struct CrossVmSyncRecord {
        uint256 syncId;
        string cosmosBech32;
        bytes32 keyspaceDigest;
        uint8 identityRole;
        uint64 syncedAt;
        bytes32 nativeReplyHash;
    }

    ITrexIdentityRegistryCrossVm public identityRegistry;
    bool public enforceIdentityVerification;
    string public nativeTargetContract;
    uint256 public syncCount;

    mapping(address => CrossVmSyncRecord) private _lastSyncByAccount;

    event CrossVmIdentitySynced(
        uint256 indexed syncId,
        address indexed evmAccount,
        string cosmosBech32,
        bytes32 keyspaceDigest,
        uint8 identityRole,
        string nativeTarget,
        bytes nativeReply
    );

    event CustomCrossVmPayloadDispatched(
        uint256 indexed syncId,
        string nativeTarget,
        bytes32 payloadHash,
        bytes nativeReply
    );

    event NativeTargetContractUpdated(string previousTarget, string newTarget);
    event IdentityRegistryUpdated(address indexed previousRegistry, address indexed newRegistry);
    event IdentityVerificationPolicyUpdated(bool enforceVerification);

    error ZeroAddress();
    error InvalidIdentityRole();
    error InvalidAsciiNote();
    error EmptyTargetContract();
    error EmptyPayload();
    error IdentityNotVerified(address account);
    error BridgeCallFailed(bytes reason);
    error BridgeNotActive();

    bytes16 private constant HEX_DIGITS = "0123456789abcdef";

    constructor(
        address initialOwner,
        address _identityRegistry,
        bool _enforceIdentityVerification
    ) Ownable(initialOwner) {
        if (initialOwner == address(0)) revert ZeroAddress();
        identityRegistry = ITrexIdentityRegistryCrossVm(_identityRegistry);
        enforceIdentityVerification = _enforceIdentityVerification;
        nativeTargetContract = DEFAULT_NATIVE_RECEIPTS_CONTRACT;
    }

    /// @notice Atomically dispatches an ONCHAINID v3 ERC-7930 identity & compliance attestation receipt
    ///         from QoreChain EVM to QoreChain Native (CosmWasm) via precompile 0x0901.
    function dispatchIdentitySync(
        address evmAccount,
        string calldata cosmosBech32,
        bytes32 keyspaceDigest,
        uint8 identityRole
    ) external returns (uint256 syncId, bytes memory nativeReply) {
        if (evmAccount == address(0)) revert ZeroAddress();
        if (identityRole > 7) revert InvalidIdentityRole();
        _validateSafeAscii(bytes(cosmosBech32), 1, 90);

        if (enforceIdentityVerification && address(identityRegistry) != address(0)) {
            if (!identityRegistry.isVerified(evmAccount)) {
                revert IdentityNotVerified(evmAccount);
            }
        }

        string memory note = buildReceiptNote(evmAccount, cosmosBech32, keyspaceDigest, identityRole);
        _validateSafeAscii(bytes(note), 1, 140);

        bytes memory payload = bytes(string.concat('{"record":{"note":"', note, '"}}'));
        nativeReply = _callNativeBridge(nativeTargetContract, payload);

        syncId = ++syncCount;
        _lastSyncByAccount[evmAccount] = CrossVmSyncRecord({
            syncId: syncId,
            cosmosBech32: cosmosBech32,
            keyspaceDigest: keyspaceDigest,
            identityRole: identityRole,
            syncedAt: uint64(block.timestamp),
            nativeReplyHash: keccak256(nativeReply)
        });

        emit CrossVmIdentitySynced(
            syncId,
            evmAccount,
            cosmosBech32,
            keyspaceDigest,
            identityRole,
            nativeTargetContract,
            nativeReply
        );
    }

    /// @notice Allows sovereign owner to dispatch a raw CosmWasm JSON payload to any governance-allowlisted target via 0x0901.
    function dispatchCustomCompliancePayload(
        string calldata targetContract,
        bytes calldata jsonPayload
    ) external onlyOwner returns (uint256 syncId, bytes memory nativeReply) {
        if (bytes(targetContract).length == 0) revert EmptyTargetContract();
        if (jsonPayload.length == 0) revert EmptyPayload();

        nativeReply = _callNativeBridge(targetContract, jsonPayload);
        syncId = ++syncCount;

        emit CustomCrossVmPayloadDispatched(syncId, targetContract, keccak256(jsonPayload), nativeReply);
    }

    /// @notice Formats a compact, JSON-injection-safe receipt note (<= 140 printable ASCII bytes) for `qday-receipts-w3`.
    function buildReceiptNote(
        address evmAccount,
        string calldata cosmosBech32,
        bytes32 keyspaceDigest,
        uint8 identityRole
    ) public pure returns (string memory) {
        return string.concat(
            "TREX-ERC7930|r=",
            _uint8ToString(identityRole),
            "|evm=",
            _shortHexAddress(evmAccount),
            "|qor=",
            cosmosBech32,
            "|d=",
            _shortHexBytes32(keyspaceDigest)
        );
    }

    function getLastSync(address evmAccount) external view returns (CrossVmSyncRecord memory) {
        return _lastSyncByAccount[evmAccount];
    }

    // =========================================================================
    // Sovereign Governance Controls
    // =========================================================================

    function setNativeTargetContract(string calldata newTarget) external onlyOwner {
        if (bytes(newTarget).length == 0) revert EmptyTargetContract();
        string memory prev = nativeTargetContract;
        nativeTargetContract = newTarget;
        emit NativeTargetContractUpdated(prev, newTarget);
    }

    function setIdentityRegistry(address newRegistry) external onlyOwner {
        address prev = address(identityRegistry);
        identityRegistry = ITrexIdentityRegistryCrossVm(newRegistry);
        emit IdentityRegistryUpdated(prev, newRegistry);
    }

    function setEnforceIdentityVerification(bool enforce) external onlyOwner {
        enforceIdentityVerification = enforce;
        emit IdentityVerificationPolicyUpdated(enforce);
    }

    // =========================================================================
    // Internal Fail-Closed 0x0901 Precompile Invocation & ASCII Validation
    // =========================================================================

    function _callNativeBridge(
        string memory targetContract,
        bytes memory payload
    ) internal returns (bytes memory) {
        (bool ok, bytes memory ret) = CROSS_VM_BRIDGE_PRECOMPILE.call(
            abi.encodeWithSignature(
                "executeCrossVMCall(uint8,string,bytes)",
                TARGET_VM_NATIVE,
                targetContract,
                payload
            )
        );
        if (!ok) revert BridgeCallFailed(ret);
        // Strictly fail-closed: an inactive precompile returns ok=true with 0 bytes.
        if (ret.length == 0) revert BridgeNotActive();

        if (ret.length >= 64) {
            uint256 offset;
            assembly {
                offset := mload(add(ret, 32))
            }
            if (offset == 32) {
                return abi.decode(ret, (bytes));
            }
        }
        return ret;
    }

    /// @dev Enforces printable ASCII (0x20..0x7E) excluding `"` (0x22) and `\` (0x5C) to prevent JSON injection.
    function _validateSafeAscii(bytes memory data, uint256 minLen, uint256 maxLen) internal pure {
        uint256 len = data.length;
        if (len < minLen || len > maxLen) revert InvalidAsciiNote();
        for (uint256 i = 0; i < len; i++) {
            bytes1 b = data[i];
            if (b < 0x20 || b > 0x7e || b == 0x22 || b == 0x5c) {
                revert InvalidAsciiNote();
            }
        }
    }

    function _shortHexAddress(address account) internal pure returns (string memory) {
        bytes20 raw = bytes20(account);
        bytes memory out = new bytes(12);
        out[0] = "0";
        out[1] = "x";
        for (uint256 i = 0; i < 5; i++) {
            uint8 b = uint8(raw[i]);
            out[2 + i * 2] = HEX_DIGITS[b >> 4];
            out[3 + i * 2] = HEX_DIGITS[b & 0x0f];
        }
        return string(out);
    }

    function _shortHexBytes32(bytes32 value) internal pure returns (string memory) {
        bytes memory out = new bytes(12);
        for (uint256 i = 0; i < 6; i++) {
            uint8 b = uint8(value[i]);
            out[i * 2] = HEX_DIGITS[b >> 4];
            out[1 + i * 2] = HEX_DIGITS[b & 0x0f];
        }
        return string(out);
    }

    function _uint8ToString(uint8 value) internal pure returns (string memory) {
        bytes memory out = new bytes(1);
        out[0] = bytes1(uint8(48 + value));
        return string(out);
    }
}
