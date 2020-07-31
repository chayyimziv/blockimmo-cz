pragma solidity ^0.5.4;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

/**
 * @title WhitelistProxy
 * @dev Points to `Whitelist`, enabling it to be upgraded if absolutely necessary.
 *
 * Contracts reference `this.whitelist` to locate `Whitelist`.
 * This contract is never intended to be upgraded.
 */
contract WhitelistProxy is Ownable {
  address public whitelist;

  event Set(address whitelist);

  function set(address _whitelist) public onlyOwner {
    whitelist = _whitelist;
    emit Set(whitelist);
  }
}
