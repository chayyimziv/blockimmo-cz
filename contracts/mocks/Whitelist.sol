pragma solidity ^0.5.4;

import "openzeppelin-solidity/contracts/access/Roles.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

contract RBAC {
  using Roles for Roles.Role;

  mapping (string => Roles.Role) private roles;

  event RoleAdded(address indexed operator, string role);
  event RoleRemoved(address indexed operator, string role);

  /**
   * @dev reverts if addr does not have role
   * @param _operator address
   * @param _role the name of the role
   * // reverts
   */
  function checkRole(address _operator, string memory _role)
    public
    view
  {
    require(roles[_role].has(_operator), "_operator does not have _role");
  }

  /**
   * @dev determine if addr has role
   * @param _operator address
   * @param _role the name of the role
   * @return bool
   */
  function hasRole(address _operator, string memory _role)
    public
    view
    returns (bool)
  {
    return roles[_role].has(_operator);
  }

  /**
   * @dev add a role to an address
   * @param _operator address
   * @param _role the name of the role
   */
  function addRole(address _operator, string memory _role)
    internal
  {
    roles[_role].add(_operator);
    emit RoleAdded(_operator, _role);
  }

  /**
   * @dev remove a role from an address
   * @param _operator address
   * @param _role the name of the role
   */
  function removeRole(address _operator, string memory _role)
    internal
  {
    roles[_role].remove(_operator);
    emit RoleRemoved(_operator, _role);
  }

  /**
   * @dev modifier to scope access to a single role (uses msg.sender as addr)
   * @param _role the name of the role
   * // reverts
   */
  modifier onlyRole(string memory _role)
  {
    checkRole(msg.sender, _role);
    _;
  }
}

/**
 * @title Whitelist
 * @dev A minimal, simple database mapping public addresses (ie users) to their permissions.
 *
 * `TokenizedProperty` references `this` to only allow tokens to be transferred to addresses with necessary permissions.
 * `TokenSale` references `this` to only allow tokens to be purchased by addresses within the necessary permissions.
 *
 * `WhitelistProxy` enables `this` to be easily and reliably upgraded if absolutely necessary.
 * `WhitelistProxy` and `this` are controlled by a centralized entity (blockimmo).
 *  This centralization is required by our legal framework to ensure investors are known and fully-legal.
 */
contract Whitelist is Ownable, RBAC {
  function grantPermission(address _operator, string memory _permission) public onlyOwner {
    addRole(_operator, _permission);
  }

  function revokePermission(address _operator, string memory _permission) public onlyOwner {
    removeRole(_operator, _permission);
  }

  function grantPermissionBatch(address[] memory _operators, string memory _permission) public onlyOwner {
    for (uint256 i = 0; i < _operators.length; i++) {
      addRole(_operators[i], _permission);
    }
  }

  function revokePermissionBatch(address[] memory _operators, string memory _permission) public onlyOwner {
    for (uint256 i = 0; i < _operators.length; i++) {
      removeRole(_operators[i], _permission);
    }
  }
}
