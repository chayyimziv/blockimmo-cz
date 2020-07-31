const Web3 = require('web3');

let web3js;
let web3jsInfura;

const options = { transactionConfirmationBlocks: 1 };
function resetWeb3js (infura = false) {
  if (infura) {
    web3jsInfura = new Web3(new Web3.providers.WebsocketProvider('wss://mainnet.infura.io/ws/v3/59b36f013d48495a93435c2fa6b188a6'), null, options);
  } else {
    if (window.ethereum) {
      web3js = new Web3(window.ethereum, null, options);
    } else if (window.web3) {
      web3js = new Web3(web3.currentProvider, null, options);
    }
  }
}

function getWeb3jsInfura () {
  if (typeof web3jsInfura === 'undefined' || !web3jsInfura || !web3jsInfura.currentProvider.connected) {
    resetWeb3js(true);
  }

  return web3jsInfura;
}

function getWeb3js () {
  if (typeof web3js === 'undefined' || !web3js) {
    resetWeb3js();
  }

  return web3js || getWeb3jsInfura();
}

function initContract (name, address, infura = false) {
  const { abi } = require(`./build/contracts/${name}.json`);
  const _web3js = infura ? getWeb3jsInfura() : getWeb3js();
  return new _web3js.eth.Contract(abi, address);
}

/**
 const web3js = blockimmoContracts.getWeb3js();
 const { toHex } = web3js.utils;

 const abi = '';
 const data = '';

 const contract = new web3js.eth.Contract(abi);
 contract.deploy({ data }).send({ from: '0x7c01EB2f7F98eEf60447BF620136d2dFA9Ee5420', gas: 2000000, gasPrice: toHex(10e9) }).then(console.log);
 */

export { getWeb3js, initContract, resetWeb3js };
