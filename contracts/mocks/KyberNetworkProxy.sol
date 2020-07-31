pragma solidity ^0.5.4;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";

contract KyberNetworkProxy {
  using SafeERC20 for IERC20;
  using SafeMath for uint256;

  address public constant ETH_TOKEN_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

  function trade(IERC20 src, uint256 srcAmount, IERC20 dest, address destAddress, uint256 maxDestAmount, uint256 minConversionRate, address walletId) public payable returns (uint256) {
    return address(src) == ETH_TOKEN_ADDRESS ? swapEtherToToken(dest, minConversionRate) : swapTokenToToken(src, srcAmount, dest, minConversionRate);
  }

  function swapEtherToToken(IERC20 token, uint minConversionRate) internal returns (uint) {
    token.safeTransfer(msg.sender, msg.value.mul(minConversionRate));
    return msg.value.mul(minConversionRate);
  }

  function swapTokenToToken(IERC20 src, uint srcAmount, IERC20 dest, uint minConversionRate) internal returns (uint) {
    src.safeTransferFrom(msg.sender, address(this), srcAmount);
    dest.safeTransfer(msg.sender, srcAmount.mul(minConversionRate));
    return srcAmount.mul(minConversionRate);
  }
}
