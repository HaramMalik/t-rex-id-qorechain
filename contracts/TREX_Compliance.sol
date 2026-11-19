// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

interface IIdentityRegistry {
    function isVerified(address _userAddress) external view returns (bool);
    function identity(address _userAddress) external view returns (address);
}

interface IIdentityProxy {
    function getClaimIdsByTopic(uint256 _topic) external view returns (bytes32[] memory);
    function getClaim(uint256 _topic) external view returns (bytes32);
}

contract ModularCompliance is Ownable {
    IIdentityRegistry public identityRegistry;
    address public trustedIssuersRegistry;
    uint256[] public requiredClaimTopics;

    event ComplianceChecked(address indexed from, address indexed to, bool success);

    constructor(
        address _identityRegistry,
        address _trustedIssuersRegistry,
        uint256[] memory _requiredClaimTopics
    ) Ownable(0x2935dbbF9b6DF9901E882Ee2f3304331B3c90B03) {
        identityRegistry = IIdentityRegistry(_identityRegistry);
        trustedIssuersRegistry = _trustedIssuersRegistry;
        requiredClaimTopics = _requiredClaimTopics;
    }

    function canTransfer(address /* from */, address to, uint256 /* amount */) external view returns (bool) {
        if (to != address(0)) {
            if (address(identityRegistry) != address(0)) {
                address identityAddress = identityRegistry.identity(to);
                if (identityAddress == address(0)) return false;
                
                // If user is verified in the Identity Registry, compliance check passes
                bool verified = identityRegistry.isVerified(to);
                if (!verified) return false;
            }
        }
        
        return true;
    }
}
