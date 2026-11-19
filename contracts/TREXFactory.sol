// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./storage/IdentityRegistryStorage.sol";
import "./TrustedIssuersRegistry.sol";
import "./TREX_Compliance.sol";
import "./MockERC3643.sol";

/**
 * @title TREXFactory
 * @notice Master factory deploying full permissioned ERC-3643 suites on QoreChain EVM.
 * @dev Integrates post-quantum compliance registries and sovereign ONCHAINID anchors.
 */
contract TREXFactory is Ownable {
    event TREXSuiteDeployed(
        address indexed token,
        address indexed compliance,
        address indexed identityStorage,
        address trustedIssuersRegistry
    );

    address[] public deployedTokens;
    mapping(address => bool) public isTREXToken;

    constructor() Ownable(0x2935dbbF9b6DF9901E882Ee2f3304331B3c90B03) {}

    /**
     * @notice Deploys a full ERC-3643 compliant security token with dedicated registries.
     * @param name Token legal name
     * @param symbol Token financial ticker
     * @param identityRegistry Address of the bound identity registry
     * @param trustedIssuers Address of the trusted claim issuers registry
     * @param claimTopics Array of required claim topics (e.g., [100, 101, 103])
     */
    function deployTREXSuite(
        string memory name,
        string memory symbol,
        address identityRegistry,
        address trustedIssuers,
        uint256[] memory claimTopics
    ) external onlyOwner returns (address tokenAddress, address complianceAddress) {
        ModularCompliance compliance = new ModularCompliance(
            identityRegistry,
            trustedIssuers,
            claimTopics
        );
        complianceAddress = address(compliance);

        MockERC3643 token = new MockERC3643(
            name,
            symbol,
            complianceAddress
        );
        tokenAddress = address(token);

        deployedTokens.push(tokenAddress);
        isTREXToken[tokenAddress] = true;

        emit TREXSuiteDeployed(
            tokenAddress,
            complianceAddress,
            identityRegistry,
            trustedIssuers
        );
    }

    function getDeployedTokensCount() external view returns (uint256) {
        return deployedTokens.length;
    }
}
