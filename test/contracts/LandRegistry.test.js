const { expectEvent, shouldFail, constants } = require('openzeppelin-test-helpers');

const LandRegistry = artifacts.require('LandRegistry');
const LandRegistryProxy = artifacts.require('LandRegistryProxy');

contract('LandRegistry', ([from, other]) => {
  const address = '0xC5A168eD2A712F7E5747f09A70524994D6D1687d';
  const eGrid = 'CH123456789012';

  before(async function () {
    this.landRegistryProxy = await LandRegistryProxy.new({ from });
  });

  beforeEach(async function () {
    this.landRegistry = await LandRegistry.new({ from });

    const { logs } = await this.landRegistryProxy.set(this.landRegistry.address, { from });
    expectEvent.inLogs(logs, 'Set', {
      landRegistry: this.landRegistry.address,
    });

    (await this.landRegistryProxy.landRegistry.call()).should.be.equal(this.landRegistry.address);
  });

  it('tokenized a property', async function () {
    const { logs } = await this.landRegistry.tokenizeProperty(eGrid, address, { from });
    expectEvent.inLogs(logs, 'Tokenized', { eGrid, property: address });
  });

  it('only blockimmo can tokenized a property', async function () {
    await shouldFail.reverting(this.landRegistry.tokenizeProperty(eGrid, address, { from: other }));
  });

  it('eGrid must be set', async function () {
    await shouldFail.reverting(this.landRegistry.tokenizeProperty('', address, { from }));
  });

  it('property address must be set', async function () {
    await shouldFail.reverting(this.landRegistry.tokenizeProperty(eGrid, constants.ZERO_ADDRESS, { from }));
  });

  it('eGrid must be unique (property does not exist in the land registry)', async function () {
    await this.landRegistry.tokenizeProperty(eGrid, address, { from });
    await shouldFail.reverting(this.landRegistry.tokenizeProperty(eGrid, address, { from }));
  });

  it('adds multiple properties to the land registry', async function () {
    await this.landRegistry.tokenizeProperty(eGrid, address, { from });
    await this.landRegistry.tokenizeProperty(eGrid.replace('C', 'D'), address.replace('c', 'd'), { from });
  });

  it('get a property from the land registry', async function () {
    await this.landRegistry.tokenizeProperty(eGrid, address, { from });
    (await this.landRegistry.getProperty.call(eGrid, { from: other })).should.be.equal(address);
  });

  it('eGrid does not exist in the land registry', async function () {
    (await this.landRegistry.getProperty.call(eGrid, { from: other })).should.be.equal(constants.ZERO_ADDRESS);
  });

  it('remove a property from the land registry', async function () {
    await this.landRegistry.tokenizeProperty(eGrid, address, { from });

    const { logs } = await this.landRegistry.untokenizeProperty(eGrid, { from });
    expectEvent.inLogs(logs, 'Untokenized', { eGrid, property: address });
  });

  it('only blockimmo can remove from the land registry', async function () {
    await this.landRegistry.tokenizeProperty(eGrid, address, { from });
    await shouldFail.reverting(this.landRegistry.untokenizeProperty(eGrid, { from: other }));
  });

  it('eGrid does not exist in the land registry', async function () {
    await shouldFail.reverting(this.landRegistry.untokenizeProperty(eGrid, { from }));
  });
});
