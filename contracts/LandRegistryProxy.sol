pragma solidity ^0.5.4;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

/**
 * @title LandRegistryProxy
 * @dev Points to `LandRegistry`, enabling it to be upgraded if absolutely necessary.
 *
 * Contracts reference `this.landRegistry` to locate `LandRegistry`.
 * They also reference `owner` to identify blockimmo's 'administrator' (currently blockimmo but ownership may be transferred to a
 * contract / DAO in the near-future, or even rescinded).
 *
 * `TokenizedProperty` references `this` to enforce the `LandRegistry` and route blockimmo's 1% transaction fee on dividend payouts.
 * `ShareholderDAO` references `this` to allow blockimmo's 'administrator' to extend proposals for any `TokenizedProperty`.
 * `TokenSale` references `this` to route blockimmo's 1% transaction fee on sales.
 *
 * For now this centralized 'administrator' provides an extra layer of control / security until our contracts are time and battle tested.
 *
 * This contract is never intended to be upgraded.
 */
contract LandRegistryProxy is Ownable {
  address public landRegistry;

  event Set(address indexed landRegistry);

  function set(address _landRegistry) public onlyOwner {
    landRegistry = _landRegistry;
    emit Set(landRegistry);
  }
}
