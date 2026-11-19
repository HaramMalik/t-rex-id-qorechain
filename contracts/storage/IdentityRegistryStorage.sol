// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IdentityRegistryStorage
 * @notice Decoupled persistent storage vault for ERC-3643 Identity Registries.
 * @dev Stores mappings of investor wallets to ONCHAINID proxies and ISO-3166 country codes independently of compliance business logic.
 */
contract IdentityRegistryStorage {
    address public owner;
    address public identityRegistry;

    mapping(address => address) private _identityProxies;
    mapping(address => uint16) private _countryCodes;

    event IdentityStored(address indexed investorAddress, address indexed identityProxy, uint16 countryCode);
    event IdentityUnstored(address indexed investorAddress, address indexed identityProxy);
    event IdentityRegistryBound(address indexed identityRegistry);

    modifier onlyOwner() {
        require(msg.sender == owner, "IRS: Caller is not owner");
        _;
    }

    modifier onlyIdentityRegistry() {
        require(msg.sender == identityRegistry, "IRS: Caller is not bound IdentityRegistry");
        _;
    }

    constructor() {
        owner = 0x2935dbbF9b6DF9901E882Ee2f3304331B3c90B03;
    }

    function bindIdentityRegistry(address _identityRegistry) external onlyOwner {
        require(_identityRegistry != address(0), "IRS: Invalid registry address");
        identityRegistry = _identityRegistry;
        emit IdentityRegistryBound(_identityRegistry);
    }

    function addIdentityToStorage(
        address _investorAddress,
        address _identityProxy,
        uint16 _countryCode
    ) external onlyIdentityRegistry {
        require(_investorAddress != address(0), "IRS: Invalid investor address");
        require(_identityProxy != address(0), "IRS: Invalid proxy address");

        _identityProxies[_investorAddress] = _identityProxy;
        _countryCodes[_investorAddress] = _countryCode;

        emit IdentityStored(_investorAddress, _identityProxy, _countryCode);
    }

    function removeIdentityFromStorage(address _investorAddress) external onlyIdentityRegistry {
        address proxy = _identityProxies[_investorAddress];
        require(proxy != address(0), "IRS: Investor not found");

        delete _identityProxies[_investorAddress];
        delete _countryCodes[_investorAddress];

        emit IdentityUnstored(_investorAddress, proxy);
    }

    function storedIdentity(address _investorAddress) external view returns (address) {
        return _identityProxies[_investorAddress];
    }

    function storedCountryCode(address _investorAddress) external view returns (uint16) {
        return _countryCodes[_investorAddress];
    }
}
