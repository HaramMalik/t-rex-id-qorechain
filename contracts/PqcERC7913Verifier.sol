// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IERC7913SignatureVerifier
/// @notice Official ERC-7913 signature verifier interface used by OpenZeppelin AccountERC7579 & ONCHAINID v3.
interface IERC7913SignatureVerifier {
    /// @dev Verifies `signature` as a valid signature of `hash` by `key`.
    ///      MUST return `IERC7913SignatureVerifier.verify.selector` (0x024ad318) if valid.
    ///      SHOULD return `0xffffffff` if invalid or empty.
    function verify(
        bytes calldata key,
        bytes32 hash,
        bytes calldata signature
    ) external view returns (bytes4);
}

/// @title PqcERC7913Verifier
/// @notice Stateless, fail-closed ERC-7913 signature verifier for ONCHAINID v3 & OpenZeppelin AccountERC7579
///         smart accounts delegating NIST FIPS 204 (ML-DSA-87) verification to QoreChain Diana's
///         native precompile at 0x0000000000000000000000000000000000000A01 (`pqcVerify`).
contract PqcERC7913Verifier is IERC7913SignatureVerifier {
    /// @notice QoreChain native NIST FIPS 204 ML-DSA-87 signature verification precompile.
    address public constant PQC_VERIFY_PRECOMPILE = address(0x0A01);

    /// @notice Canonical QoreChain algorithm identifier for ML-DSA-87 (Dilithium-5).
    uint8 public constant ML_DSA_87_ALG_ID = 1;

    /// @notice ERC-7913 magic return value (`bytes4(keccak256("verify(bytes,bytes32,bytes)")) == 0x024ad318`).
    bytes4 public constant ERC7913_MAGIC_VALUE = IERC7913SignatureVerifier.verify.selector;

    /// @notice ERC-7913 rejection return value.
    bytes4 public constant ERC7913_INVALID = 0xffffffff;

    /// @inheritdoc IERC7913SignatureVerifier
    function verify(
        bytes calldata key,
        bytes32 hash,
        bytes calldata signature
    ) external view override returns (bytes4) {
        return _verifyMlDsa87(key, hash, signature) ? ERC7913_MAGIC_VALUE : ERC7913_INVALID;
    }

    /// @notice ONCHAINID v3 / ERC-7579 SignerERC7913 helper splitting `signer = abi.encodePacked(verifier, pubkey)`.
    /// @dev Supports direct stateless execution when `verifier == address(this)` and fail-closed delegation
    ///      for any external ERC-7913 verifier contract.
    function isValidOnchainIdV3Signer(
        bytes calldata signer,
        bytes32 hash,
        bytes calldata signature
    ) external view returns (bool) {
        if (signer.length <= 20 || signature.length == 0) {
            return false;
        }

        address verifier = address(bytes20(signer[:20]));
        bytes calldata pubkey = signer[20:];
        if (pubkey.length == 0) {
            return false;
        }

        if (verifier == address(this)) {
            return _verifyMlDsa87(pubkey, hash, signature);
        }

        (bool ok, bytes memory raw) = verifier.staticcall(
            abi.encodeWithSelector(ERC7913_MAGIC_VALUE, pubkey, hash, signature)
        );
        if (!ok || raw.length < 32) {
            return false;
        }
        return abi.decode(raw, (bytes4)) == ERC7913_MAGIC_VALUE;
    }

    /// @notice Probes whether the 0x0A01 pqcVerify precompile is active on the current network.
    function precompileActive() external view returns (bool) {
        (bool ok, bytes memory raw) = PQC_VERIFY_PRECOMPILE.staticcall(
            abi.encodeWithSignature("pqcVerify(bytes,bytes,bytes)", bytes(""), bytes(""), bytes(""))
        );
        return ok && raw.length >= 32;
    }

    function _verifyMlDsa87(
        bytes calldata key,
        bytes32 hash,
        bytes calldata signature
    ) internal view returns (bool) {
        if (key.length == 0 || signature.length == 0) {
            return false;
        }

        (bool ok, bytes memory raw) = PQC_VERIFY_PRECOMPILE.staticcall(
            abi.encodeWithSignature(
                "pqcVerify(bytes,bytes,bytes)",
                key,
                signature,
                abi.encodePacked(hash)
            )
        );
        if (!ok || raw.length < 32) {
            return false;
        }

        return abi.decode(raw, (bool));
    }
}
