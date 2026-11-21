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
