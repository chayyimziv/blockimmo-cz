pragma solidity ^0.5.3;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";

contract MoneyMarket {
  using SafeERC20 for IERC20;
  using SafeMath for uint256;

  mapping(address => mapping(address => uint256)) private balances;

  function getSupplyBalance(address account, address asset) public view returns (uint) {
    return balances[account][asset];
  }

  function supply(address asset, uint amount) public returns (uint) {
    IERC20 token = IERC20(asset);
    token.safeTransferFrom(msg.sender, address(this), amount);

    balances[msg.sender][asset] = balances[msg.sender][asset].add(amount);
    return 0;
  }

  function withdraw(address asset, uint requestedAmount) public returns (uint) {
    require(balances[msg.sender][asset] >= requestedAmount);
    balances[msg.sender][asset] = balances[msg.sender][asset].sub(requestedAmount);

    IERC20 token = IERC20(asset);
    token.safeTransfer(msg.sender, requestedAmount);
    return 0;
  }
}
