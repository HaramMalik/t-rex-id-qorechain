// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

interface IModularCompliance {
    function canTransfer(address from, address to, uint256 amount) external view returns (bool);
}

contract MockERC3643 is ERC20, Ownable, Pausable {
    IModularCompliance public compliance;
    
    mapping(address => bool) public frozenAddresses;
    
    event AddressFrozen(address indexed userAddress, bool isFrozen);
    event TokensMinted(address indexed to, uint256 amount);
    event ForcedTransfer(address indexed from, address indexed to, uint256 amount);
    event TokensBurned(address indexed from, uint256 amount);
    
    mapping(address => bool) public isAgent;
    
    event AgentAdded(address indexed _agent);
    event AgentRemoved(address indexed _agent);

    modifier onlyAgent() {
        require(msg.sender == owner() || isAgent[msg.sender], "Caller is not an agent or owner");
        _;
    }

    constructor(
        string memory _name,
        string memory _symbol,
        address _compliance
    ) ERC20(_name, _symbol) Ownable(0x2935dbbF9b6DF9901E882Ee2f3304331B3c90B03) {
        compliance = IModularCompliance(_compliance);
        address master = 0x35912ee176F003800eBd1A60819A9Df51147cF3A;
        address issuer2 = 0x914878F73c95b26Cb8c575908AB95bb133B278e9;
        address sovereignOwner = 0x2935dbbF9b6DF9901E882Ee2f3304331B3c90B03;
        isAgent[master] = true;
        emit AgentAdded(master);
        isAgent[issuer2] = true;
        emit AgentAdded(issuer2);
        isAgent[sovereignOwner] = true;
        emit AgentAdded(sovereignOwner);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function addAgent(address _agent) external onlyOwner {
        require(_agent != address(0), "Invalid agent address");
        isAgent[_agent] = true;
        emit AgentAdded(_agent);
    }

    function removeAgent(address _agent) external onlyOwner {
        isAgent[_agent] = false;
        emit AgentRemoved(_agent);
    }
    
    function setCompliance(address _compliance) external onlyOwner {
        compliance = IModularCompliance(_compliance);
    }
    
    function freezeAddress(address _userAddress) external onlyOwner {
        frozenAddresses[_userAddress] = true;
        emit AddressFrozen(_userAddress, true);
    }
    
    function unfreezeAddress(address _userAddress) external onlyOwner {
        frozenAddresses[_userAddress] = false;
        emit AddressFrozen(_userAddress, false);
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    function mint(address _to, uint256 _amount) external onlyAgent {
        require(!frozenAddresses[_to], "Address is frozen");
        require(isEligible(address(0), _to, _amount), "Receiver not compliant");
        _mint(_to, _amount);
        emit TokensMinted(_to, _amount);
    }
    
    function faucetMint(address to, uint256 amount) external {
        require(!frozenAddresses[to], "Address is frozen");
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }
    
    function burn(address _from, uint256 _amount) external onlyAgent {
        _burn(_from, _amount);
        emit TokensBurned(_from, _amount);
    }
    
    function forcedTransfer(address _from, address _to, uint256 _amount) external onlyAgent {
        require(!frozenAddresses[_to], "Receiver is frozen");
        require(isEligible(_from, _to, _amount), "Transfer not compliant");
        _transfer(_from, _to, _amount);
        emit ForcedTransfer(_from, _to, _amount);
    }
    
    function isEligible(address _from, address _to, uint256 _amount) public view returns (bool) {
        if (address(compliance) != address(0)) {
            return compliance.canTransfer(_from, _to, _amount);
        }
        return true;
    }
    
    function _update(address from, address to, uint256 value) internal override whenNotPaused {
        if (from != address(0)) {
            require(!frozenAddresses[from], "Sender is frozen");
        }
        if (to != address(0)) {
            require(!frozenAddresses[to], "Receiver is frozen");
        }
        
        // Exclude minting/burning from the transfer check directly in _update if we already checked in mint()
        if (from != address(0) && to != address(0)) {
            require(isEligible(from, to, value), "Transfer not compliant");
        }
        
        super._update(from, to, value);
    }
}
