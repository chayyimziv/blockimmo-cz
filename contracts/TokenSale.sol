/**
 * Copyright (c) 2019 blockimmo AG license@blockimmo.ch
 * No license
 */

pragma solidity ^0.5.4;

import "openzeppelin-solidity/contracts/crowdsale/validation/CappedCrowdsale.sol";
import "openzeppelin-solidity/contracts/crowdsale/distribution/FinalizableCrowdsale.sol";
import "openzeppelin-solidity/contracts/crowdsale/distribution/PostDeliveryCrowdsale.sol";

import "./LoanEscrow.sol";

contract LandRegistryProxyInterface {
  function owner() public view returns (address);
}

contract WhitelistInterface {
  function checkRole(address _operator, string memory _role) public view;
  function hasRole(address _operator, string memory _role) public view returns (bool);
}

contract WhitelistProxyInterface {
  function whitelist() public view returns (WhitelistInterface);
}

/**
 * @title TokenSale
 * @dev Distribute tokens to investors in exchange for Dai.
 *
 * This is the primary mechanism for outright sales of commercial investment properties (and blockimmo's STO, where shares
 * of our company are represented as `TokenizedProperty`).
 *
 * Selling:
 *   1. Deploy `TokenizedProperty`. Initially all tokens and ownership of this property will be assigned to the 'deployer'
 *   2. Deploy `ShareholderDAO` and transfer the property's (1) ownership to it
 *   3. Configure and deploy `TokenSale`
 *     - After completing (1, 2, 3), blockimmo will verify the property as legitimate in `LandRegistry`
 *     - blockimmo will then authorize `this` to the `Whitelist` before seller can proceed to (4)
 *   4. Transfer tokens of `TokenizedProperty` (1) to be sold to `this` (3)
 *   5. Investors are able to buy tokens while the sale is open. 'Deployer' calls `finalize` to complete the sale
 *
 * Note: blockimmo will be responsible for managing initial sales on our platform. This means we will be configuring
 *       and deploying all contracts for sellers. This provides an extra layer of control/security until we've refined
 *       these processes and proven them in the real-world.
 *
 * Unsold tokens (of a successful sale) are redistributed proportionally to investors via Airdrop, as described in:
 * https://medium.com/FundFantasy/airdropping-vs-burning-part-1-613a9c6ebf1c
 *
 * If `goal` is not reached, investors will be refunded Dai, and the 'deployer' refunded tokens.
 */
contract TokenSale is CappedCrowdsale, FinalizableCrowdsale, LoanEscrow, PostDeliveryCrowdsale {
  LandRegistryProxyInterface public registryProxy = LandRegistryProxyInterface(0xe72AD2A335AE18e6C7cdb6dAEB64b0330883CD56);  // 0x0f5Ea0A652E851678Ebf77B69484bFcD31F9459B;
  WhitelistProxyInterface public whitelistProxy = WhitelistProxyInterface(0x7223b032180CDb06Be7a3D634B1E10032111F367);  // 0xEC8bE1A5630364292E56D01129E8ee8A9578d7D8;

  mapping(address => bool) public claimedRefund;
  uint256 public goal;
  mapping(address => bool) public reversed;
  uint256 public totalTokens;

  constructor (
    uint256 _cap,
    uint256 _closingTime,
    uint256 _goal,
    uint256 _openingTime,
    uint256 _rate,
    IERC20 _token,
    address payable _wallet
  )
  public
    Crowdsale(_rate, _wallet, _token)
    CappedCrowdsale(_cap)
    FinalizableCrowdsale()
    TimedCrowdsale(_openingTime, _closingTime)
    PostDeliveryCrowdsale()
  {
    goal = _goal;
  }

  function blockimmo() public view returns (address) {
    return registryProxy.owner();
  }

  function claimRefund(address _refundee) public {
    require(finalized() && !goalReached());
    require(!claimedRefund[_refundee]);

    claimedRefund[_refundee] = true;
    pull(_refundee, deposits[_refundee], true);
  }

  function goalReached() public view returns (bool) {
    return weiRaised() >= goal;
  }

  function hasClosed() public view returns (bool) {
    return capReached() || super.hasClosed();
  }

  function reverse(address _account) public {
    require(!finalized());
    require(!reversed[_account]);
    WhitelistInterface whitelist = whitelistProxy.whitelist();
    require(!whitelist.hasRole(_account, "authorized"));

    reversed[_account] = true;
    pull(_account, deposits[_account], true);
  }

  function totalTokensSold() public view returns (uint256) {
    return _getTokenAmount(weiRaised());
  }

  function withdrawTokens(address beneficiary) public {  // airdrop remaining tokens to investors proportionally
    require(finalized() && goalReached(), "withdrawTokens requires the TokenSale to be successfully finalized");
    require(!reversed[beneficiary]);

    uint256 extra = totalTokens.sub(totalTokensSold()).mul(balanceOf(beneficiary)).div(totalTokensSold());
    _deliverTokens(beneficiary, extra);

    super.withdrawTokens(beneficiary);
  }

  function weiRaised() public view returns (uint256) {
    return deposited;
  }

  function _getTokenAmount(uint256 weiAmount) internal view returns (uint256) {
    return weiAmount.div(rate());
  }

  function _finalization() internal {
    require(msg.sender == blockimmo() || msg.sender == wallet());
    super._finalization();

    totalTokens = token().balanceOf(address(this));

    if (goalReached()) {
      uint256 fee = weiRaised().div(100);

      pull(blockimmo(), fee, false);
      pull(wallet(), weiRaised().sub(fee), false);
    } else {
      token().safeTransfer(wallet(), totalTokens);
    }
  }

  function _processPurchase(address beneficiary, uint256 tokenAmount) internal {
    super._processPurchase(beneficiary, tokenAmount);
    deposit(beneficiary, tokenAmount.mul(rate()));
  }

  function _preValidatePurchase(address beneficiary, uint256 weiAmount) internal view {
    require(msg.value == 0, "ether loss");
    require(!reversed[beneficiary]);

    super._preValidatePurchase(beneficiary, weiAmount);

    WhitelistInterface whitelist = whitelistProxy.whitelist();
    whitelist.checkRole(beneficiary, "authorized");
    require(deposits[beneficiary].add(weiAmount) <= 100000e18 || whitelist.hasRole(beneficiary, "uncapped"));
  }

  function _weiAmount() internal view returns (uint256) {
    return dai.allowance(msg.sender, address(this));
  }
}
