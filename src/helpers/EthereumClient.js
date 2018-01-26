const debug = require('debug')('dx-service:repositories:EthereumClient')
const Web3 = require('web3')
const truffleContract = require('truffle-contract')

// TODO: Check eventWatcher in DX/test/utils.js

class EthereumClient {
  constructor ({ url = 'http://127.0.0.1:8545', contractsBaseDir = 'build/contracts' }) {
    debug('Using %s RPC api to connect to Ethereum', url)
    this._url = url
    this._provider = new Web3.providers.HttpProvider(url)
    this._web3 = new Web3(this._provider)
    this._contractCache = {}
    this._contractsBaseDir = '../../' + contractsBaseDir
  }

  loadContracts ({ contractNames }) {
    // Load contract as an array of objects (props: name, instance)
    const contractPromises = Promise.all(
      contractNames.map(contractName => {
        const contract = this._contractCache[contractName]
        if (contract) {
          // The contract was preciously loaded
          return Promise.resolve(contract)
        } else {
          // Load contract
          return this._loadContract(contractName)
        }
      })
    )

    // Convert array into an object (name => instance)
    return contractPromises.then(contracts => {
      return contracts.reduce((contractsObject, contract) => {
        contractsObject[contract.name] = contract.instance
        return contractsObject
      }, {})
    })
  }

  getUrl () {
    return this._url
  }

  getBlock (block = 'latest') {
    return this._web3.eth.getBlock(block)
  }

  getCoinbase () {
    return this._web3.eth.coinbase
  }

  getBlockNumber () {
    return this._web3.eth.blockNumber
  }

  getWeb3 () {
    return this._web3
  }

  _loadContract (contractName) {
    const contractJson = require(`${this._contractsBaseDir}/${contractName}`)
    const contract = truffleContract(contractJson)
    contract.setProvider(this._provider)

    return contract
      .deployed()
      .then(contractInstance => {
        return {
          name: contractName,
          instance: contractInstance
        }
      })
  }
}

module.exports = EthereumClient
