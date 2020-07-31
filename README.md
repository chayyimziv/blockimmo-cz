<img src="https://s3.eu-central-1.amazonaws.com/blockimmo-assets/logo.gif" alt="blockimmo" width="400px">

[![NPM Package](https://img.shields.io/npm/v/@blockimmo/contracts.svg?style=flat-square)](https://www.npmjs.org/package/@blockimmo/contracts)

# blockimmo-contracts
The [smart contracts](https://en.wikipedia.org/wiki/Smart_contract) powering blockimmo

Built on the Ethereum blockchain, Solidity, and OpenZeppelin:
- using common contract security patterns (See [Onward with Ethereum Smart Contract Security](https://medium.com/bitcorps-blog/onward-with-ethereum-smart-contract-security-97a827e47702#.y3kvdetbz))
- in the [Solidity language](https://solidity.readthedocs.io/en/develop/).

> NOTE: New to smart contract development? Check OpenZeppelin's [introductory guide](https://medium.com/zeppelin-blog/the-hitchhikers-guide-to-smart-contracts-in-ethereum-848f08001f05#.cox40d2ut).

## Getting Started

blockimmo integrates with [Truffle](https://github.com/ConsenSys/truffle).

## Installing blockimmo-contracts

After installing Truffle, to install the blockimmo platform smart contracts, run the following in your Solidity project root directory:

```sh
cd blockimmo-contracts
npm i
sh scripts/test.sh
```

### Smart contracts

| Contract                                                         | Version                                                                                                                               | Description                                                                                                               |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| [`LandRegistry`](/contracts/LandRegistry.sol)                                      | v1.0.0                                                 | A minimal, simple database mapping properties to their on-chain representation (`TokenizedProperty`).                                                                 |
| [`LandRegistryProxy`](/contracts/LandRegistryProxy.sol)                       | v1.0.0                        | Points to `LandRegistry`, enabling it to be upgraded if absolutely necessary.                                                                     |
| [`Whitelist`](/contracts/Whitelist.sol)                         | v1.0.0                         | A minimal, simple database mapping public addresses (ie users) to their permissions.                                                                           |
| [`WhitelistProxy`](/contracts/WhitelistProxy.sol)           | v1.0.0           | Points to `Whitelist`, enabling it to be upgraded if absolutely necessary.                                                           |
| [`TokenizedProperty`](r/contracts/TokenizedProperty.sol)                       | v1.0.0                       | An asset-backed token (a property as identified by its E-GRID (a UUID) in the (Swiss) land registry).                                                        |
| [`DividendDistributingToken`](/contracts/DividendDistributingToken.sol)             | v1.0.0             | An ERC20-compliant token that distributes any Ether it receives to its token holders proportionate to their share. |
| [`ShareholderDAO`](/contracts/ShareholderDAO.sol)                   | v1.0.0                   | A simple DAO attached to a `TokenizedProperty` (ownership of the property is transferred to `this`).                                                                    |
| [`TokenSale`](/contracts/TokenSale.sol)             | v1.0.0             | Distribute tokens to investors in exchange for Ether.                                                                                                              |

## Tests
Unit test are critical to the blockimmo platform. They help ensure code quality and mitigate against security vulnerabilities. The directory structure within the `/tests` directory corresponds to the `/contracts` directory. blockimmo uses Mocha’s JavaScript testing framework and Chai’s assertion library. To learn more about how to tests are structured, please reference [OpenZeppelin’s Testing Guide](https://github.com/OpenZeppelin/openzeppelin-solidity#tests).

## Testing notes
Some of our contracts rely on the addresses of the deployed `LandRegistryProxy`, `Medianizer`, and `WhitelistProxy` smart contracts. These addresses differ between testing, Ropsten, and Main net. Comments in our smart contracts indicate which addresses must be used for each kind of deployment.

## Security
blockimmo is meant to provide a secure, tested, and audited platform for real-estate.

We follow the core development principles and strategies that OpenZeppelin is based on including: security in depth, simple and modular code, clarity-driven naming conventions, comprehensive unit testing, pre-and-post-condition sanity checks, code consistency, and regular audits.

If you find a security issue, please make an issue at our [HackerOne page](https://hackerone.com/blockimmo).

## Other docs
- https://medium.com/blockimmo/the-smart-contracts-powering-blockimmo-fc16e1bbee09

## License
Copyright (c) 2018 blockimmo AG license@blockimmo.ch
# blockimmo-cz
