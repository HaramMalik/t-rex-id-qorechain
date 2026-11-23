// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title MockPqcKeyStatusPrecompile
/// @notice Test mock mimicking QoreChain's 0x0A02 `pqcKeyStatus` precompile ABI layout.
contract MockPqcKeyStatusPrecompile {
    struct KeyRecord {
        bool registered;
        uint8 algorithmId;
        bytes pubkey;
        bool possessionProven;
    }

    mapping(address => KeyRecord) private _records;

    function setKeyStatus(
        address account,
        bool registered,
        uint8 algorithmId,
        bytes calldata pubkey,
        bool possessionProven
    ) external {
        _records[account] = KeyRecord({
            registered: registered,
            algorithmId: algorithmId,
            pubkey: pubkey,
            possessionProven: possessionProven
        });
    }

    function pqcKeyStatus(address account)
        external
        view
        returns (bool registered, uint8 algorithmId, bytes memory pubkey, bool possessionProven)
    {
        KeyRecord storage rec = _records[account];
        return (rec.registered, rec.algorithmId, rec.pubkey, rec.possessionProven);
    }
}

/// @title MockPqcVerifyPrecompile
/// @notice Test mock mimicking QoreChain's 0x0A01 `pqcVerify` precompile ABI layout.
contract MockPqcVerifyPrecompile {
    mapping(bytes32 => bool) public acceptedProofs;

    function setAcceptedProof(
        bytes calldata pubkey,
        bytes calldata signature,
        bytes calldata message,
        bool valid
    ) external {
        bytes32 h = keccak256(abi.encode(pubkey, signature, message));
        acceptedProofs[h] = valid;
    }

    function pqcVerify(
        bytes calldata pubkey,
        bytes calldata signature,
        bytes calldata message
    ) external view returns (bool valid) {
        bytes32 h = keccak256(abi.encode(pubkey, signature, message));
        return acceptedProofs[h];
    }
}

/// @title MockTrexIdentityRegistry
/// @notice Minimal ERC-3643 IdentityRegistry verification mock for unit testing.
contract MockTrexIdentityRegistry {
    mapping(address => bool) private _verified;

    function setVerified(address account, bool status) external {
        _verified[account] = status;
    }

    function isVerified(address account) external view returns (bool) {
        return _verified[account];
    }
}

/// @title MockCrossVmBridgePrecompile
/// @notice Test mock mimicking QoreChain's 0x0901 `executeCrossVMCall(uint8,string,bytes)` precompile.
contract MockCrossVmBridgePrecompile {
    uint8 public lastTargetVm;
    string public lastTargetContract;
    bytes public lastPayload;
    uint256 public callCount;
    bool public shouldRevert;
    bytes public mockReply;

    mapping(string => bool) public allowedTargets;
    bool public enforceAllowlist;

    error TargetNotAllowlisted(string target);
    error MockBridgeFailure();

    function setAllowlist(string calldata target, bool allowed) external {
        allowedTargets[target] = allowed;
    }

    function setEnforceAllowlist(bool enforce) external {
        enforceAllowlist = enforce;
    }

    function setShouldRevert(bool flag) external {
        shouldRevert = flag;
    }

    function setMockReply(bytes calldata reply) external {
        mockReply = reply;
    }

    function executeCrossVMCall(
        uint8 targetVM,
        string calldata targetContract,
        bytes calldata payload
    ) external returns (bytes memory) {
        if (shouldRevert) revert MockBridgeFailure();
        if (enforceAllowlist && !allowedTargets[targetContract]) {
            revert TargetNotAllowlisted(targetContract);
        }
        lastTargetVm = targetVM;
        lastTargetContract = targetContract;
        lastPayload = payload;
        callCount += 1;
        return mockReply.length > 0 ? mockReply : bytes('{"receipt_id":1,"status":"ok"}');
    }
}

