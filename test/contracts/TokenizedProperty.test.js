const { BN, ether, expectEvent, shouldFail } = require('openzeppelin-test-helpers');

const LandRegistry = artifacts.require('LandRegistry');
const LandRegistryProxy = artifacts.require('LandRegistryProxy');
const TokenizedProperty = artifacts.require('TokenizedProperty');
const Whitelist = artifacts.require('Whitelist');
const WhitelistProxy = artifacts.require('WhitelistProxy');

contract('TokenizedProperty', ([blockimmo, other, unauthorized, from]) => {
  const eGrid = 'CH123456789012';
  const grundstuckNumber = 'CH-ZG1234';

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

    await this.whitelist.grantPermissionBatch([from, other], 'authorized', { from: blockimmo });
  });

  beforeEach(async function () {
    this.tokenizedProperty = await TokenizedProperty.new(eGrid, grundstuckNumber, { from });
    await this.landRegistry.tokenizeProperty(eGrid, this.tokenizedProperty.address, { from: blockimmo });

    this.decimals = await this.tokenizedProperty.decimals.call();
    this.numTokens = await this.tokenizedProperty.NUM_TOKENS.call();
    this.totalSupply = ether(this.numTokens);
  });

  afterEach(async function () {
    await this.landRegistry.untokenizeProperty(eGrid, { from: blockimmo });
  });

  it('deploy', async function () {
    (await this.tokenizedProperty.balanceOf.call(from)).should.be.bignumber.equal(this.totalSupply);
    (await this.tokenizedProperty.name.call()).should.be.equal(eGrid);
    (await this.tokenizedProperty.symbol.call()).should.be.equal(grundstuckNumber);
  });

  it('transfer', async function () {
    const value = this.totalSupply.divn(1000);

    const { logs } = await this.tokenizedProperty.transfer(other, value, { from });
    expectEvent.inLogs(logs, 'Transfer', { from, to: other, value });

    (await this.tokenizedProperty.balanceOf.call(other)).should.be.bignumber.equal(value);
  });

  it('transfers restricted', async function () {
    const value = this.totalSupply.divn(1000);
    await shouldFail.reverting(this.tokenizedProperty.transfer(unauthorized, value, { from }));
  });

  it('transfers out not restricted', async function () {
    const value = this.totalSupply.divn(1000);

    await this.whitelist.revokePermission(from, 'authorized', { from: blockimmo });

    const { logs } = await this.tokenizedProperty.transfer(other, value, { from });
    expectEvent.inLogs(logs, 'Transfer', { from, to: other, value });
  });

  it('can not transfer if untokenized', async function () {
    await this.landRegistry.untokenizeProperty(eGrid, { from: blockimmo });

    await shouldFail.reverting(this.tokenizedProperty.transfer(other, this.totalSupply.divn(1000), { from }));

    await this.landRegistry.tokenizeProperty(eGrid, this.tokenizedProperty.address, { from: blockimmo });
  });
});
