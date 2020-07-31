const { expectEvent, shouldFail } = require('openzeppelin-test-helpers');

const Whitelist = artifacts.require('Whitelist');
const WhitelistProxy = artifacts.require('WhitelistProxy');

const role = 'authorized';

contract('Whitelist', ([from, other]) => {
  before(async function () {
    this.whitelistProxy = await WhitelistProxy.new({ from });
  });

  beforeEach(async function () {
    this.whitelist = await Whitelist.new({ from });

    const { logs } = await this.whitelistProxy.set(this.whitelist.address);
    expectEvent.inLogs(logs, 'Set', { whitelist: this.whitelist.address });

    (await this.whitelistProxy.whitelist.call()).should.be.equal(this.whitelist.address);
  });

  it('owner can add whitelist', async function () {
    await shouldFail.reverting(this.whitelist.checkRole(other, role));
    await this.whitelist.grantPermission(other, role);
    await this.whitelist.checkRole(other, role);
  });

  it('owner can revoke permission', async function () {
    await this.whitelist.grantPermission(other, role);
    await this.whitelist.revokePermission(other, role);
    await shouldFail.reverting(this.whitelist.checkRole(other, role));
  });

  it('owner can add permissions in batch', async function () {
    await shouldFail.reverting(this.whitelist.checkRole(from, role));
    await shouldFail.reverting(this.whitelist.checkRole(other, role));
    await this.whitelist.grantPermissionBatch([from, other], role);
    await this.whitelist.checkRole(from, role);
    await this.whitelist.checkRole(other, role);
  });

  it('owner can revoke permission in batch', async function () {
    await this.whitelist.grantPermissionBatch([from, other], role);
    await this.whitelist.revokePermissionBatch([from, other], role);
    await shouldFail.reverting(this.whitelist.checkRole(from, role));
    await shouldFail.reverting(this.whitelist.checkRole(other, role));
  });

  it('others can not add/remove permissions', async function () {
    await shouldFail.reverting(this.whitelist.grantPermission(other, role, { from: other }));
    await shouldFail.reverting(this.whitelist.grantPermissionBatch([from, other], role, { from: other }));

    await this.whitelist.grantPermissionBatch([from, other], role);
    await shouldFail.reverting(this.whitelist.revokePermission(from, role, { from: other }));
    await shouldFail.reverting(this.whitelist.revokePermissionBatch([from, other], role, { from: other }));
  });
});
