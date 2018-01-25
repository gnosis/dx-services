const instanceFactory = require('../../src/helpers/instanceFactory')
const contractNames = ['DutchExchange', 'TokenOWL', 'TokenTUL']
const config = {
  AUCTION_REPO_IMPL: 'ethereum'
}

function testSetup () {
  return instanceFactory({ test: true, config })
    .then(instances => {
      return instances.ethereumClient
        .loadContracts({ contractNames })
        .then(contracts => {
          // Return contracts plus the test instances of the instance factory
          return Object.assign({}, contracts, instances)
        })
    })
}

module.exports = testSetup
/*
const Web3 = require('web3')
// const dutchExchangeJson = require('../../build/contracts/DutchExchange.json')

const contractNames = ['DutchExchange', 'TokenOWL', 'TokenTUL']
const contractsBaseDir = '../../node_modules/@gnosis.pm/dutch-exchange/build/contracts'

function setup ({ url = 'http://127.0.0.1:8545' }) {
  // Get usefull info
  const provider = new Web3.providers.HttpProvider(url)
  const web3 = new Web3(provider)
  const address = web3.eth.coinbase

  // Get contracts
  return getContractPromises(provider)
    .then(contracts => {
      const setupResult = {
        address,
        web3
      }
      contracts.forEach(contract => {
        setupResult[contract.name] = contract.instance
      })

      return setupResult
    })
}

// Setup and returns a promise of:
//  - all contracts (see contractNames)
//  - address
module.exports = setup
*/
