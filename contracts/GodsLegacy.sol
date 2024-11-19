// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract GodsLegacy is ERC20, Ownable, ReentrancyGuard, Pausable {

    //allows you to validate or invalidate the burn tax (manipulate the function to sendTo)
    bool public isTransferWithBurnEnabled = false;
    // Variable for burn transfer tax (example 5 = 0.5%)
    uint256 public burnRate = 0;
    // Mapping to store the rarity of each token
    mapping(uint256 => uint256) public tokenRarity;
    // Token burning event
    event Burn(address indexed from, uint256 amount);
    constructor() ERC20("Gods Legacy", "GDLC") Ownable(msg.sender) {
        _mint(address(this), 1_000_000_000 * (10 ** 18));
    }

    /**
     * @notice Enables the transferWithBurn function, allowing token transfers with burning.
     * Only callable by the owner of the contract.
     **/
    function enableTransferWithBurn() external onlyOwner {
        isTransferWithBurnEnabled = true;
    }

    /**
     * @notice Disables the transferWithBurn function, preventing token transfers with burning.
     * Only callable by the owner of the contract.
     **/
    function disableTransferWithBurn() external onlyOwner {
        isTransferWithBurnEnabled = false;
    }

    /**
    * @notice Sets the token burn rate for transfer function.
    *
    * @param _burnRate The burn rate to set, expressed in thousandths (1/1000).
    * @dev This function can only be called by the owner of the contract.
    * @dev The burn rate must be greater than 0 and less than or equal to 1000 (100%).
    **/
    function setBurnRate(uint256 _burnRate) external onlyOwner {
        require(_burnRate > 0, "Burn rate must be greater than zero");
        require(_burnRate <= 1000, "Burn rate must be less than or equal to 1000");
        burnRate = _burnRate;
    }

    /**
    * @notice Sends tokens from the contract owner's address to `_to`.
    * @param _to The recipient address to send tokens to.
    * @param _amount The amount of tokens to send.
    * @return A boolean indicating whether the transfer was successful.
    **/
    function send(address _to, uint256 _amount) external onlyOwner nonReentrant returns (bool) {
        uint256 contractBalance = balanceOf(address(this));
        require(contractBalance >= _amount, "Insufficient token balance in contract");

        _transfer(address(this), _to, _amount);
        
        emit Transfer(address(this), _to, _amount);
        return true;
    }

    /**
    * @notice Sends tokens from the sender's address to `_to`, with optional burning.
    * @param _to The recipient address to send tokens to.
    * @param _amount The amount of tokens to send.
    * @return A boolean indicating whether the transfer was successful.
    */
    function transfer(address _to, uint256 _amount) public override nonReentrant whenNotPaused returns (bool) {
        require(_amount > 0, "Amount must be greater than zero");

        uint256 burnAmount = 0;
        if (isTransferWithBurnEnabled && burnRate > 0) {
            burnAmount = (_amount * burnRate) / 1000;
        }

        uint256 minBurnAmount = 1;

        if (burnAmount < minBurnAmount) {
            burnAmount = 0;
        }

        uint256 amountToTransfer = _amount - burnAmount;
        uint256 senderBalance = balanceOf(msg.sender);
        require(senderBalance >= _amount, "Insufficient balance for transfer");

        _transfer(msg.sender, _to, amountToTransfer);

        if (burnAmount > 0) {
            _burn(msg.sender, burnAmount);
            emit Burn(msg.sender, burnAmount);
        }
        return true;
    }

   /**
    * @notice Transfers tokens from `_from` to `_to` with additional functionalities like burning tokens.
    * @param _from The address from which to transfer tokens.
    * @param _to The address to which to transfer tokens.
    * @param _amount The amount of tokens to transfer.
    * @return A boolean indicating whether the transfer was successful.
    */
    function transferFrom(address _from, address _to, uint256 _amount) public override nonReentrant whenNotPaused returns (bool) {
        require(_amount > 0, "Amount must be greater than zero");

        uint256 currentAllowance = allowance(_from, msg.sender);
        require(currentAllowance >= _amount, "Allowance exceeded");

        uint256 burnAmount = 0;
        if (isTransferWithBurnEnabled && burnRate > 0) {
            burnAmount = (_amount * burnRate) / 1000;
        }

        uint256 minBurnAmount = 1;

        if (burnAmount < minBurnAmount) {
            burnAmount = 0;
        }

        uint256 amountToTransfer = _amount - burnAmount;
        require(balanceOf(_from) >= _amount, "Insufficient balance for transfer");

        _approve(_from, msg.sender, currentAllowance - _amount);

        _transfer(_from, _to, amountToTransfer);

        if (burnAmount > 0) {
            _burn(_from, burnAmount);
            emit Burn(_from, burnAmount);
        }
        return true;
    }

    /**
     * @notice Mints new tokens and assigns them to the smart contract itself.
     * @param _amount The amount of tokens to mint.
     * @dev This function can only be called by the owner of the contract.
    */
    function mint(uint256 _amount) external onlyOwner nonReentrant {
        _mint(address(this), _amount);
    }

    /**
     * @notice Function to verify if the caller is the owner or not.
     * @return The boolean true or false.
     */
    function isOwner() external view returns (bool) {
        return msg.sender == owner();
    }
    /**
    * @notice Pauses all token transfers and certain contract functions.
    * @dev This function can only be called by the owner of the contract.
    * When the contract is paused, all token transfers and functions that are 
    * restricted by the `whenNotPaused` modifier will be disabled.
    */
    function pause() external onlyOwner {
        _pause();
    }

    /**
    * @notice Unpauses the contract, allowing token transfers and certain functions to resume.
    * @dev This function can only be called by the owner of the contract.
    * When the contract is unpaused, token transfers and functions that are 
    * restricted by the `whenNotPaused` modifier will be enabled again.
    */
    function unpause() external onlyOwner {
        _unpause();
    }
}
