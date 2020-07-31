const { BN, ether, expectEvent, shouldFail } = require('openzeppelin-test-helpers');

const LandRegistry = artifacts.require('LandRegistry');
const LandRegistryProxy = artifacts.require('LandRegistryProxy');
const KyberNetworkProxy = artifacts.require('KyberNetworkProxy');
const MoneyMarket = artifacts.require('MoneyMarket');
const PaymentsLayer = artifacts.require('PaymentsLayer');
const TokenizedProperty = artifacts.require('TokenizedProperty');
const Whitelist = artifacts.require('Whitelist');
const WhitelistProxy = artifacts.require('WhitelistProxy');

async function balanceDifference (account, token, promiseFunc) {
  const balanceBefore = new BN(await token.balanceOf(account));
  await promiseFunc();
  const balanceAfter = new BN(await token.balanceOf(account));
  return balanceAfter.sub(balanceBefore);
}

contract('TokenizedProperty', ([blockimmo, account1, account2, managementCompany, from]) => {
  const eGrid = 'CH123456789012';
  const grundstuckNumber = 'CH-ZG1234';

  const value = ether('1');
  const fee = value.divn(100);
  const valueAfterFee = value.sub(fee);

  const ETH_TOKEN_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

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

    this.fundingToken = await TokenizedProperty.new('DAI', 'DAI', { from: managementCompany });
    await this.landRegistry.tokenizeProperty('DAI', this.fundingToken.address, { from: blockimmo });
    this.fundingToken.address.should.be.equal('0x9Ad61E35f8309aF944136283157FABCc5AD371E5');

    this.moneyMarket = await MoneyMarket.new();
    this.moneyMarket.address.should.be.equal('0x6732c278C58FC90542cce498981844A073D693d7');

    this.kyberNetworkProxy = await KyberNetworkProxy.new();
    this.kyberNetworkProxy.address.should.be.equal('0x564540a26Fb667306b3aBdCB4ead35BEb88698ab');

    await this.whitelist.grantPermissionBatch([blockimmo, account1, account2, from, this.moneyMarket.address], 'authorized', { from: blockimmo });
  });

  beforeEach(async function () {
    this.contract = await TokenizedProperty.new(eGrid, grundstuckNumber, { from });
    this.totalSupply = await this.contract.totalSupply.call();

    await this.landRegistry.tokenizeProperty(eGrid, this.contract.address, { from: blockimmo });
    await this.whitelist.grantPermission(this.contract.address, 'authorized', { from: blockimmo });
  });

  afterEach(async function () {
    await this.landRegistry.untokenizeProperty(eGrid, { from: blockimmo });
    await this.whitelist.revokePermission(this.contract.address, 'authorized', { from: blockimmo });
  });

  it('deposits dividends', async function () {
    await this.fundingToken.approve(this.contract.address, value, { from: managementCompany });
    (await balanceDifference(blockimmo, this.fundingToken, () => this.contract.depositDividends({ from: managementCompany }))).should.be.bignumber.equal(fee);
    (await this.contract.deposits(managementCompany)).should.be.bignumber.equal(valueAfterFee);
  });

  it('deposits dividends ether', async function () {
    this.paymentsLayer = await PaymentsLayer.new();

    await this.whitelist.grantPermissionBatch([this.kyberNetworkProxy.address, this.paymentsLayer.address], 'authorized', { from: blockimmo });
    await this.fundingToken.transfer(this.kyberNetworkProxy.address, value, { from: managementCompany });

    const encodedFunctionCall = web3.eth.abi.encodeFunctionCall({
      name: 'depositDividends',
      type: 'function',
      inputs: [],
    }, []);
    await this.paymentsLayer.forwardPayment(ETH_TOKEN_ADDRESS, value, this.fundingToken.address, this.contract.address, 1, encodedFunctionCall, { from: managementCompany, value });

    (await this.contract.deposits(this.paymentsLayer.address)).should.be.bignumber.equal(valueAfterFee);
    (await balanceDifference(from, this.fundingToken, () => this.contract.collectOwedDividends(from, { from }))).should.be.bignumber.equal(valueAfterFee);
  });

  it('no value', async function () {
    await shouldFail.reverting(web3.eth.sendTransaction({ from: managementCompany, to: this.contract.address, value: 0 }));
  });

  it('collects dividend payouts', async function () {
    await this.fundingToken.approve(this.contract.address, value, { from: managementCompany });
    await this.contract.depositDividends({ from: managementCompany });

    const { logs } = await this.contract.collectOwedDividends(from, { from: blockimmo });
    expectEvent.inLogs(logs, 'DividendsCollected', {
      collector: from,
      amount: valueAfterFee,
    });
  });

  it('no dividends', async function () {
    await shouldFail.reverting(this.contract.collectOwedDividends(from, { from }));
  });

  it('collects (different) dividend payouts', async function () {
    await this.contract.transfer(account1, this.totalSupply / 1e18, { from });

    await this.fundingToken.approve(this.contract.address, value, { from: managementCompany });
    await this.contract.depositDividends({ from: managementCompany });

    (await balanceDifference(from, this.fundingToken, () => this.contract.collectOwedDividends(from, { from }))).should.be.bignumber.equal(valueAfterFee.subn(1));
    await shouldFail.reverting(this.contract.collectOwedDividends(account1, { from: account1 }));

    // (await balance.current(this.contract.address)).should.be.bignumber.equal(new BN(1));
  });

  it('collects (three) dividend payouts', async function () {
    await this.contract.transfer(account1, this.totalSupply / 1e17, { from });
    await this.contract.transfer(account2, this.totalSupply / 1e18, { from });

    await this.fundingToken.approve(this.contract.address, value, { from: managementCompany });
    await this.contract.depositDividends({ from: managementCompany });

    (await balanceDifference(from, this.fundingToken, () => this.contract.collectOwedDividends(from, { from }))).should.be.bignumber.equal(valueAfterFee.subn(11));
    (await balanceDifference(account1, this.fundingToken, () => this.contract.collectOwedDividends(account1, { from: account1 }))).should.be.bignumber.equal(new BN(9));
    await shouldFail.reverting(this.contract.collectOwedDividends(account2, { from: account2 }));

    // (await balance.current(this.contract.address)).should.be.bignumber.equal(new BN(2));
  });

  it('transfer after deposit', async function () {
    await this.fundingToken.approve(this.contract.address, value, { from: managementCompany });
    await this.contract.depositDividends({ from: managementCompany });

    await this.contract.transfer(account1, this.totalSupply.divn(2), { from });

    (await balanceDifference(from, this.fundingToken, () => this.contract.collectOwedDividends(from, { from }))).should.be.bignumber.equal(valueAfterFee);
  });

  it('accumulate dividends', async function () {
    await this.fundingToken.approve(this.contract.address, value, { from: managementCompany });
    await this.contract.depositDividends({ from: managementCompany });

    await this.fundingToken.approve(this.contract.address, value, { from: managementCompany });
    await this.contract.depositDividends({ from: managementCompany });

    (await balanceDifference(from, this.fundingToken, () => this.contract.collectOwedDividends(from, { from }))).should.be.bignumber.equal(valueAfterFee.muln(2));
  });

  it('accumulate dividends between transfers', async function () {
    await this.fundingToken.approve(this.contract.address, value, { from: managementCompany });
    await this.contract.depositDividends({ from: managementCompany });
    await this.contract.transfer(account1, this.totalSupply.divn(2), { from });

    await this.fundingToken.approve(this.contract.address, value, { from: managementCompany });
    await this.contract.depositDividends({ from: managementCompany });

    (await balanceDifference(from, this.fundingToken, () => this.contract.collectOwedDividends(from, { from }))).should.be.bignumber.equal(valueAfterFee.add(valueAfterFee.divn(2)));
    (await balanceDifference(account1, this.fundingToken, () => this.contract.collectOwedDividends(account1, { from: account1 }))).should.be.bignumber.equal(valueAfterFee.divn(2));
  });

  it('accumulate dividends in small amounts (rounding down)', async function () {
    await this.contract.transfer(account1, this.totalSupply / 1e19, { from });

    await this.fundingToken.approve(this.contract.address, value, { from: managementCompany });
    await this.contract.depositDividends({ from: managementCompany });

    await this.fundingToken.approve(this.contract.address, ether(new BN(10)), { from: managementCompany });
    await this.contract.depositDividends({ from: managementCompany });

    (await balanceDifference(account1, this.fundingToken, () => this.contract.collectOwedDividends(account1, { from: account1 }))).should.be.bignumber.equal(new BN(1));
    // (await balance.current(this.contract.address)).should.be.bignumber.equal(valueAfterFee.muln(11).subn(1));
  });

  it('deposits and collects dividends when untokenized', async function () {
    await this.landRegistry.untokenizeProperty(eGrid, { from: blockimmo });

    await this.fundingToken.approve(this.contract.address, value, { from: managementCompany });
    await this.contract.depositDividends({ from: managementCompany });

    (await balanceDifference(from, this.fundingToken, () => this.contract.collectOwedDividends(from, { from }))).should.be.bignumber.equal(valueAfterFee);
    await this.landRegistry.tokenizeProperty(eGrid, this.contract.address, { from: blockimmo });
  });
});
