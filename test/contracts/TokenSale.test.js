const { balance, BN, ether, expectEvent, shouldFail, time, constants } = require('openzeppelin-test-helpers');

const LandRegistry = artifacts.require('LandRegistry');
const LandRegistryProxy = artifacts.require('LandRegistryProxy');
const KyberNetworkProxy = artifacts.require('KyberNetworkProxy');
const MoneyMarket = artifacts.require('MoneyMarket');
const PaymentsLayer = artifacts.require('PaymentsLayer');
const TokenizedProperty = artifacts.require('TokenizedProperty');
const TokenSale = artifacts.require('TokenSale');
const Whitelist = artifacts.require('Whitelist');
const WhitelistProxy = artifacts.require('WhitelistProxy');

contract('TokenSale', function ([blockimmo, from, investor, purchaser, wallet, w1, w2, w3, w4, w5]) {
  const eGrid = 'CH123456789012';
  const grundstuckNumber = 'CH-ZG1234';

  const cap = ether('1000');
  const goal = ether('100');
  const rate = new BN(100); // 100 dai gets you 1 token ==> max hard cap of 100M dai
  const value = ether('42');

  const expectedTokenAmount = value.div(rate);

  const ETH_TOKEN_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

  context('with token', async function () {
    before(async function () {
      this.landRegistryProxy = await LandRegistryProxy.new({ from: blockimmo });
      this.landRegistryProxy.address.toLowerCase().should.be.equal('0x0f5ea0a652e851678ebf77b69484bfcd31f9459b');

      this.whitelistProxy = await WhitelistProxy.new({ from: blockimmo });
      this.whitelistProxy.address.toLowerCase().should.be.equal('0xec8be1a5630364292e56d01129e8ee8a9578d7d8');

      this.landRegistry = await LandRegistry.new({ from: blockimmo });
      await this.landRegistryProxy.set(this.landRegistry.address);
      (await this.landRegistryProxy.landRegistry.call()).should.be.equal(this.landRegistry.address);

      this.whitelist = await Whitelist.new({ from: blockimmo });
      await this.whitelistProxy.set(this.whitelist.address);
      (await this.whitelistProxy.whitelist.call()).should.be.equal(this.whitelist.address);

      this.fundingToken = await TokenizedProperty.new('DAI', 'DAI', { from: purchaser });
      await this.landRegistry.tokenizeProperty('DAI', this.fundingToken.address, { from: blockimmo });
      this.fundingToken.address.should.be.equal('0x9Ad61E35f8309aF944136283157FABCc5AD371E5');

      this.moneyMarket = await MoneyMarket.new();
      this.moneyMarket.address.should.be.equal('0x6732c278C58FC90542cce498981844A073D693d7');

      this.kyberNetworkProxy = await KyberNetworkProxy.new();
      this.kyberNetworkProxy.address.should.be.equal('0x564540a26Fb667306b3aBdCB4ead35BEb88698ab');

      this.paymentsLayer = await PaymentsLayer.new({ from: blockimmo });

      await this.whitelist.grantPermissionBatch([investor, purchaser, this.moneyMarket.address, from, blockimmo, wallet, this.kyberNetworkProxy.address, this.paymentsLayer.address], 'authorized', { from: blockimmo });
      this.fundingToken.transfer(this.kyberNetworkProxy.address, cap, { from: purchaser });

      await time.advanceBlock();
    });

    /* it('requires a non-null funding token', async function () {
      await shouldFail.reverting(
        TokenSale.new(cap, this, wallet, this.token.address, constants.ZERO_ADDRESS)
      );
    }); */

    context('once deployed', async function () {
      beforeEach(async function () {
        this.openingTime = (await time.latest()).add(time.duration.weeks(1));
        this.closingTime = this.openingTime.add(time.duration.weeks(1));
        this.afterClosingTime = this.closingTime.add(time.duration.seconds(1));

        this.token = await TokenizedProperty.new(eGrid, grundstuckNumber, { from });
        await this.landRegistry.tokenizeProperty(eGrid, this.token.address, { from: blockimmo });

        this.crowdsale = await TokenSale.new(cap, this.closingTime, goal, this.openingTime, rate, this.token.address, wallet, { from });

        await this.whitelist.grantPermissionBatch([this.crowdsale.address], 'authorized', { from: blockimmo });
        await this.token.transfer(this.crowdsale.address, await this.token.totalSupply(), { from });

        await this.fundingToken.approve(this.crowdsale.address, value, { from: purchaser });
      });

      afterEach(async function () {
        await this.landRegistry.untokenizeProperty(eGrid, { from: blockimmo });
      });

      describe('accepting payments', function () {
        describe('bare payments', function () {
          it('should accept payments', async function () {
            await time.increaseTo(this.openingTime);
            await this.crowdsale.sendTransaction({ from: purchaser });
            (await this.crowdsale.weiRaised()).should.be.bignumber.equal(value);
          });

          it('reverts on zero-valued payments', async function () {
            await time.increaseTo(this.openingTime);
            await shouldFail.reverting(
              this.crowdsale.send(new BN(0), { from: investor })
            );
          });
        });

        describe('buyTokens', function () {
          it('should accept payments', async function () {
            await time.increaseTo(this.openingTime);
            await this.crowdsale.buyTokens(investor, { from: purchaser });
            (await this.crowdsale.weiRaised()).should.be.bignumber.equal(value);
          });

          it('reverts on zero-valued payments', async function () {
            await time.increaseTo(this.openingTime);
            await shouldFail.reverting(
              this.crowdsale.buyTokens(investor, { from: investor })
            );
          });

          it('requires a non-null beneficiary', async function () {
            await time.increaseTo(this.openingTime);
            await shouldFail.reverting(
              this.crowdsale.buyTokens(constants.ZERO_ADDRESS, { from: purchaser })
            );
          });
        });
      });

      describe('high-level purchase', function () {
        it('should log purchase', async function () {
          await time.increaseTo(this.openingTime);
          const { logs } = await this.crowdsale.sendTransaction({ from: purchaser });
          expectEvent.inLogs(logs, 'TokensPurchased', {
            purchaser,
            beneficiary: purchaser,
            value,
            amount: expectedTokenAmount,
          });
        });

        it('should assign tokens to sender', async function () {
          await time.increaseTo(this.openingTime);
          await this.crowdsale.sendTransaction({ from: purchaser });
          (await this.crowdsale.deposits(purchaser)).should.be.bignumber.equal(value);
          (await this.crowdsale.totalTokensSold()).should.be.bignumber.equal(expectedTokenAmount);
        });

        /* it('should forward funds to wallet', async function () {
          await time.increaseTo(this.openingTime);
          (await balance.difference(wallet, () =>
            this.crowdsale.sendTransaction({ from: purchaser }))
          ).should.be.bignumber.equal(0);
          (await this.fundingToken.balanceOf(wallet)).should.be.bignumber.equal(value);
        }); */
      });

      describe('low-level purchase', function () {
        it('should log purchase', async function () {
          await time.increaseTo(this.openingTime);
          const { logs } = await this.crowdsale.buyTokens(investor, { from: purchaser });
          expectEvent.inLogs(logs, 'TokensPurchased', {
            purchaser: purchaser,
            beneficiary: investor,
            value,
            amount: expectedTokenAmount,
          });
        });

        it('should assign tokens to beneficiary', async function () {
          await time.increaseTo(this.openingTime);
          await this.crowdsale.buyTokens(investor, { from: purchaser });
          // (await this.token.balanceOf(investor)).should.be.bignumber.equal(expectedTokenAmount);
          (await this.crowdsale.deposits(investor)).should.be.bignumber.equal(value);
          (await this.crowdsale.totalTokensSold()).should.be.bignumber.equal(expectedTokenAmount);
        });

        /* it('should forward funds to wallet', async function () {
          await time.increaseTo(this.openingTime);
          (await balance.difference(wallet, () =>
            this.crowdsale.buyTokens(investor, { from: purchaser }))
          ).should.be.bignumber.equal(0);
          (await this.fundingToken.balanceOf(wallet)).should.be.bignumber.equal(value);
        }); */
      });

      describe('goal', function () {
        it('goal reached', async function () {
          await time.increaseTo(this.openingTime);
          await this.fundingToken.approve(this.crowdsale.address, goal, { from: purchaser });
          await this.crowdsale.buyTokens(investor, { from: purchaser });
          await time.increaseTo(this.afterClosingTime);
          await this.crowdsale.finalize();
        });

        it('goal not reached', async function () {
          await time.increaseTo(this.openingTime);
          await this.crowdsale.buyTokens(investor, { from: purchaser });
          await time.increaseTo(this.afterClosingTime);
          await this.crowdsale.finalize();
        });

        it('withdraw tokens', async function () {
          await time.increaseTo(this.openingTime);
          await this.fundingToken.approve(this.crowdsale.address, goal, { from: purchaser });
          await this.crowdsale.buyTokens(investor, { from: purchaser });
          await time.increaseTo(this.afterClosingTime);
          await this.crowdsale.finalize();
          await this.crowdsale.withdrawTokens(investor, { from });
        });

        it('claim refund', async function () {
          await time.increaseTo(this.openingTime);
          await this.crowdsale.buyTokens(investor, { from: purchaser });
          await time.increaseTo(this.afterClosingTime);
          await this.crowdsale.finalize();
          await this.crowdsale.claimRefund(investor, { from: investor });
        });
      });

      it('reverse payment', async function () {
        await time.increaseTo(this.openingTime);
        await this.crowdsale.buyTokens(investor, { from: purchaser });

        await this.whitelist.revokePermission(investor, 'authorized', { from: blockimmo });
        await shouldFail.reverting(this.crowdsale.reverse(investor, { from })); // contradiction, `investor` needs to be whitelisted to receive refund token
        await this.whitelist.grantPermission(investor, 'authorized', { from: blockimmo });
      });

      describe('kyber', function () {
        it('through kyber withdrawTokens', async function () {
          await time.increaseTo(this.openingTime);

          const encodedFunctionCall = web3.eth.abi.encodeFunctionCall({
            name: 'buyTokens',
            type: 'function',
            inputs: [{
              type: 'address',
              name: 'beneficiary',
            }],
          }, [investor]);
          await this.paymentsLayer.forwardPayment(ETH_TOKEN_ADDRESS, goal, this.fundingToken.address, this.crowdsale.address, 1, encodedFunctionCall, { from: purchaser, value: goal });

          await time.increaseTo(this.afterClosingTime);
          await this.crowdsale.finalize();
          await this.crowdsale.withdrawTokens(investor, { from });
        });

        it('through kyber claimRefund', async function () {
          await time.increaseTo(this.openingTime);

          const encodedFunctionCall = web3.eth.abi.encodeFunctionCall({
            name: 'buyTokens',
            type: 'function',
            inputs: [{
              type: 'address',
              name: 'beneficiary',
            }],
          }, [investor]);

          await this.fundingToken.approve(this.crowdsale.address, new BN(0), { from: purchaser });
          await this.paymentsLayer.forwardPayment(ETH_TOKEN_ADDRESS, value, this.fundingToken.address, this.crowdsale.address, 1, encodedFunctionCall, { from: purchaser, value });

          await time.increaseTo(this.afterClosingTime);
          await this.crowdsale.finalize();
          await this.crowdsale.claimRefund(investor, { from: investor });
        });
      });

      it('g3', async function () {
        const _eGrid = 'CH981806657777';
        const _grundstuckNumber = 'CH-ZG4133';

        const _cap = ether('3078400');
        const _goal = ether('3078400');
        const _rate = new BN(100);
        const _value = ether('1300000');
        const __value = ether('592800');

        const _expectedTokenAmount = _value.div(_rate);
        const __expectedTokenAmount = __value.div(_rate);

        const openingTime = (await time.latest()).add(time.duration.days(1));
        const closingTime = openingTime.add(time.duration.hours(4));
        const afterClosingTime = closingTime.add(time.duration.seconds(1));

        const token = await TokenizedProperty.new(_eGrid, _grundstuckNumber, { from });
        await this.landRegistry.tokenizeProperty(_eGrid, token.address, { from: blockimmo });

        const crowdsale = await TokenSale.new(_cap, closingTime, _goal, openingTime, _rate, token.address, w5, { from });
        await crowdsale.pause({ from });

        await this.whitelist.grantPermissionBatch([token.address, crowdsale.address], 'authorized', { from: blockimmo });
        await token.transfer(token.address, ether('800000'), { from });
        await token.transfer(crowdsale.address, ether('200000'), { from });

        await this.whitelist.grantPermissionBatch([w1, w2, w3, w4, w5], 'authorized', { from: blockimmo });
        await this.whitelist.grantPermissionBatch([w1, w2, w3, w4, w5], 'uncapped', { from: blockimmo });

        await this.fundingToken.mint(w1, _value, { from: blockimmo });
        await this.fundingToken.approve(crowdsale.address, _value, { from: w1 });
        await this.fundingToken.mint(w2, __value, { from: blockimmo });
        await this.fundingToken.approve(crowdsale.address, __value, { from: w2 });
        await this.fundingToken.mint(w3, __value, { from: blockimmo });
        await this.fundingToken.approve(crowdsale.address, __value, { from: w3 });
        await this.fundingToken.mint(w4, __value, { from: blockimmo });
        await this.fundingToken.approve(crowdsale.address, __value, { from: w4 });

        await time.increaseTo(openingTime);

        await crowdsale.buyTokens(w2, { from: w2 });
        await crowdsale.buyTokens(w3, { from: w3 });
        await crowdsale.buyTokens(w4, { from: w4 });
        await crowdsale.buyTokens(w1, { from: w1 });

        await time.increaseTo(afterClosingTime);
        await crowdsale.finalize({ from: blockimmo });

        await crowdsale.withdrawTokens(w1, { from: blockimmo });
        await crowdsale.withdrawTokens(w2, { from: blockimmo });
        await crowdsale.withdrawTokens(w3, { from: blockimmo });
        await crowdsale.withdrawTokens(w4, { from: blockimmo });

        (await token.balanceOf(w1)).should.not.be.bignumber.equal((await token.balanceOf(w2)));
        (await token.balanceOf(crowdsale.address)).should.be.bignumber.equal(new BN(2));
        (await token.balanceOf(w1)).add((await token.balanceOf(w2))).add((await token.balanceOf(w3))).add((await token.balanceOf(w4))).add((await token.balanceOf(crowdsale.address))).should.be.bignumber.equal(ether('200000'));

        (await token.balanceOf(w2)).should.be.bignumber.equal((await token.balanceOf(w3)));
        (await token.balanceOf(w3)).should.be.bignumber.equal((await token.balanceOf(w4)));

        const fee = _cap.divn(100);
        (await this.fundingToken.balanceOf(blockimmo)).should.be.bignumber.equal(fee);
        (await this.fundingToken.balanceOf(w5)).should.be.bignumber.equal(_cap.sub(fee));
      });
    });
  });
});
