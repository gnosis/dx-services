const Web3 = require('web3')
const truffleContract = require('truffle-contract')
// const dutchExchangeJson = require('../../build/contracts/DutchExchange.json')

const contractsNames = ['DutchExchange', 'TokenOWL', 'TokenTUL']
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

function getContractPromises (provider) {
  return Promise.all(
    contractsNames.map(contractName => {
      const contractJson = require(`${contractsBaseDir}/DutchExchange.json`)
      const contract = truffleContract(contractJson)
      contract.setProvider(provider)

      return contract.deployed().then(contractInstance => {
        return {
          name: contractName,
          instance: contractInstance
        }
      })
    })
  )
}

// Setup and returns a promise of:
//  - all contracts (see contractsNames)
//  - address
module.exports = setup
