/**
 * This serves as technical documentation to help understand how our platform is setup/managed.
 * It shows the simplest case of setting up the platform and tokenizing a property.
 *
 * This is not meant to be used, and is not necessarily syntatically correct
 */

const web3js = blockimmoContracts.getWeb3js();
const { toHex } = web3js.utils;

//
// blockimmo owned hardware wallets
//

const w1_landr_whitel_proxy = '0x40dc60ad718fcdb5fb3a0e179a80b0a5e7302df6';
const w2_landreg = '0x6E3F4CAe2D45Ace99a477B929742999B4b1F2307';
const w3_whitel = '0xbd6c2e7ad453c8660d4372cae8f8685c3756b459';
const w4_crowds = ''; // can be different per TokenizedProperty/TokenSale

//
// deploy land registry proxy (not intended to be updated)
//

const landRegistryProxy = new web3js.eth.Contract(require('build/contracts/LandRegistryProxy.json').abi);
landRegistryProxy.deploy({ data: require('build/contracts/LandRegistryProxy.json').data }).send({ from: w1_landr_whitel_proxy, gas: 2000000, gasPrice: toHex(10e9) }).then(console.log);

//
// deploy land registry and point proxy at it
//

const landRegistry = new web3js.eth.Contract(require('build/contracts/LandRegistry.json').abi);
landRegistry.deploy({ data: require('build/contracts/LandRegistry.json').data }).send({ from: w2_landreg, gas: 2000000, gasPrice: toHex(10e9) }).then(console.log);

landRegistryProxy.methods.set.call(landRegistry.address, { from: w1_landr_whitel_proxy });

//
// deploy whitelist proxy (not intended to be updated)
//

const whitelistProxy = new web3js.eth.Contract(require('build/contracts/WhitelistProxy.json').abi);
whitelistProxy.deploy({ data: require('build/contracts/WhitelistProxy.json').data }).send({ from: w1_landr_whitel_proxy, gas: 2000000, gasPrice: toHex(10e9) }).then(console.log);

//
// deploy whitelist and point proxy at it
//

const whitelist = new web3js.eth.Contract(require('build/contracts/Whitelist.json').abi);
whitelist.deploy({ data: require('build/contracts/Whitelist.json').data }).send({ from: w2_landreg, gas: 2000000, gasPrice: toHex(10e9) }).then(console.log);

whitelistProxy.methods.set.call(whitelist.address, { from: w1_landr_whitel_proxy });

/**
 * the on-chain blockimmo platform is setup and ready to go!
 * now properties are ready to be tokenized (TokenizedProperty) and sold via crowdsale (TokenSale)
 */

//
// tokenize the property, using https://blockimmo.ch/listing/CH123456789014 as an example
//

const eGrid = 'CH123456789014';
const tokenizedProperty = new web3js.eth.Contract(require('build/contracts/TokenizedProperty.json').abi);
tokenizedProperty.deploy({ arguments: [eGrid, 'CH-ZG1236d'], data: require('build/contracts/TokenizedProperty.json').data }).send({ from: w4_crowds, gas: 7100000, gasPrice: toHex(10e9) }).then(console.log);

//
// add `tokenizedProperty` to the `landRegistry`
//

landRegistry.methods.tokenizedProperty.call(eGrid, tokenizedProperty.address, { from: w1_landr_whitel_proxy });

//
// now that the property is tokenized, let's distribute the tokens via crowdsale
//

const tokenSale = new web3js.eth.Contract(require('build/contracts/TokenSale.json').abi);
tokenSale.deploy({ arguments: [toHex(cap), toHex(closingTime), toHex(goal), toHex(openingTime), toHex(rate), tokenizedProperty.address, w4_crowds], data: require('build/contracts/TokenSale.json').data }).send({ from: w4_crowds, gas: 7100000, gasPrice: toHex(10e9) }).then(console.log);

//
// whitelist `tokenSale` so it can hold `tokenizedProperty` and transfer it tokens to be sold
//

whitelist.methods.grantPermission.call(tokenSale.address, 'authorized', { from: w3_whitel });
tokenizedProperty.methods.transfer.call(tokenSale.address, 1e24, { from: w4_crowds });

//
// once the `tokenSale` `hasClosed()` it can be finalized by either the seller (`w4_crowds`) or blockimmo (`w1_landr_whitel_proxy`)
//

tokenSale.methods.finalize.call({ from: w4_crowds }); // funds are distributed to seller (`w4_crowds`) and 1% fee to `blockimmo` (if successful) investors can now withdraw their tokens (or full refund if unsuccessful)
