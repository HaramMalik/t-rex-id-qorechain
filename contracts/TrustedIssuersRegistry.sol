// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title TrustedIssuersRegistry
 * @notice Registry storing trusted identity claim issuers and their allowed claim topics.
 */
contract TrustedIssuersRegistry {
    address public owner;

    struct TrustedIssuer {
        address issuerAddress;
        uint256[] claimTopics;
    }

    mapping(address => uint256[]) private _issuerTopics;
    mapping(address => bool) private _isTrusted;
    address[] private _issuers;

    event TrustedIssuerAdded(address indexed issuer, uint256[] claimTopics);
    event TrustedIssuerRemoved(address indexed issuer);

    modifier onlyOwner() {
        require(msg.sender == owner, "TIR: Only owner");
        _;
    }

    constructor() {
        owner = 0x2935dbbF9b6DF9901E882Ee2f3304331B3c90B03;
        address master = 0x35912ee176F003800eBd1A60819A9Df51147cF3A;
        address issuer2 = 0x914878F73c95b26Cb8c575908AB95bb133B278e9;

        uint256[] memory topics = new uint256[](4);
        topics[0] = 100;
        topics[1] = 101;
        topics[2] = 103;
        topics[3] = 105;

        _isTrusted[master] = true;
        _issuers.push(master);
        _issuerTopics[master] = topics;
        emit TrustedIssuerAdded(master, topics);

        _isTrusted[issuer2] = true;
        _issuers.push(issuer2);
        _issuerTopics[issuer2] = topics;
        emit TrustedIssuerAdded(issuer2, topics);
    }

    function addTrustedIssuer(address issuer, uint256[] calldata claimTopics) external onlyOwner {
        require(issuer != address(0), "TIR: Invalid issuer address");
        if (!_isTrusted[issuer]) {
            _isTrusted[issuer] = true;
            _issuers.push(issuer);
        }
        _issuerTopics[issuer] = claimTopics;
        emit TrustedIssuerAdded(issuer, claimTopics);
    }

    function removeTrustedIssuer(address issuer) external onlyOwner {
        require(_isTrusted[issuer], "TIR: Issuer not trusted");
        _isTrusted[issuer] = false;
        delete _issuerTopics[issuer];

        for (uint256 i = 0; i < _issuers.length; i++) {
            if (_issuers[i] == issuer) {
                _issuers[i] = _issuers[_issuers.length - 1];
                _issuers.pop();
                break;
            }
        }
        emit TrustedIssuerRemoved(issuer);
    }

    function isTrustedIssuer(address issuer) external view returns (bool) {
        return _isTrusted[issuer];
    }

    function getTrustedIssuerTopics(address issuer) external view returns (uint256[] memory) {
        return _issuerTopics[issuer];
    }

    function getTrustedIssuers() external view returns (address[] memory) {
        return _issuers;
    }
}
