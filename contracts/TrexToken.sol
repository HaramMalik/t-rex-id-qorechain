// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title TrexToken
 * @notice ERC-3643 Reference Permissioned RWA Token bound to IdentityRegistry and ReputationCompliance.
 */
interface IERC3643Compliance {
    function canTransfer(address from, address to, uint256 amount) external view returns (bool);
}

interface IERC3643IdentityRegistry {
    function contains(address investor) external view returns (bool);
}

contract TrexToken {
    string public name = "Neural T-REX Tokenized RWA";
    string public symbol = "TREX";
    uint8 public decimals = 18;
    uint256 public totalSupply;

    address public owner;
    address public identityRegistry;
    address public compliance;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    mapping(address => bool) public isFrozen;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event AddressFrozen(address indexed target, bool isFrozen);

    modifier onlyOwner() {
        require(msg.sender == owner, "TrexToken: Only owner");
        _;
    }

    constructor(address _identityRegistry, address _compliance) {
        owner = msg.sender;
        identityRegistry = _identityRegistry;
        compliance = _compliance;

        _mint(msg.sender, 1_000_000 * 10**18);
    }

    function setIdentityRegistry(address _identityRegistry) external onlyOwner {
        identityRegistry = _identityRegistry;
    }

    function setCompliance(address _compliance) external onlyOwner {
        compliance = _compliance;
    }

    function freezeAddress(address target, bool freezeState) external onlyOwner {
        isFrozen[target] = freezeState;
        emit AddressFrozen(target, freezeState);
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        return _transfer(msg.sender, to, amount);
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 currentAllowance = allowance[from][msg.sender];
        require(currentAllowance >= amount, "TrexToken: Insufficient allowance");
        allowance[from][msg.sender] = currentAllowance - amount;
        return _transfer(from, to, amount);
    }

    function _transfer(address from, address to, uint256 amount) internal returns (bool) {
        require(from != address(0), "TrexToken: Transfer from zero address");
        require(to != address(0), "TrexToken: Transfer to zero address");
        require(balanceOf[from] >= amount, "TrexToken: Insufficient balance");
        require(!isFrozen[from] && !isFrozen[to], "TrexToken: Address frozen");

        if (identityRegistry != address(0)) {
            require(IERC3643IdentityRegistry(identityRegistry).contains(to), "TrexToken: Recipient identity not registered");
        }

        if (compliance != address(0)) {
            require(IERC3643Compliance(compliance).canTransfer(from, to, amount), "TrexToken: Compliance check failed");
        }

        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }

    function _mint(address account, uint256 amount) internal {
        require(account != address(0), "TrexToken: Mint to zero");
        totalSupply += amount;
        balanceOf[account] += amount;
        emit Transfer(address(0), account, amount);
    }
}
