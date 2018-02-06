const debug = require('debug')('dx-service:repositories:EthereumClient')
const Web3 = require('web3')
const truffleContract = require('truffle-contract')
const ROOT_DIR = '../../'

// TODO: Check eventWatcher in DX/test/utils.js

class EthereumClient {
  constructor ({ url = 'http://127.0.0.1:8545', contractsBaseDir = 'build/contracts' }) {
    debug('Using %s RPC api to connect to Ethereum', url)
    this._url = url
    this._provider = new Web3.providers.HttpProvider(url)
    this._web3 = new Web3(this._provider)
    this._contractCache = {}
    this._contractsBaseDir = contractsBaseDir
  }

  loadContracts ({ contractNames, contractsBaseDir }) {
    // Load contract as an array of objects (props: name, instance)
    // TODO: Refactor to support also contract at an address? c..at("0x1234...")
    // TODO: Interesting: MyContract.setNetwork(network_id)
    const contractPromises = Promise.all(
      contractNames.map(contractName => {
        const contract = this._contractCache[contractName]
        if (contract) {
          // The contract was preciously loaded
          debug('Got contract %s from cache', contractName)
          return Promise.resolve(contract)
        } else {
          // Load contract
          return this._loadContract(contractName, contractsBaseDir)
            .then(contract => {
              this._contractCache[contract.name] = contract.instance
              return contract
            })
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

  getBlock (blockNumber = this.getBlockNumber()) {
    return this._promisify(this._web3.eth.getBlock, blockNumber)
  }

  getCoinbase () {
    return this._web3.eth.coinbase
  }

  getBlockNumber () {
    return this._web3.eth.blockNumber
  }

  async geLastBlockTime () {
    // const blockNumber = this.getBlockNumber()
    // return this._promisify(this._web3.eth.getBlock, blockNumber)
    return this.getBlock()
      .then(block => new Date(block.timestamp * 1000))
  }

  async balanceOf (account) {
    return this._promisify(this._web3.eth.getBalance, account)
  }

  async mineBlock (id = new Date().getTime()) {
    return this._sendAsync('evm_mine', { id })
  }

  async increaseTime (increaseMs) {
    const id = Date.now()
    return this
      // Increase time
      ._sendAsync('evm_increaseTime', {
        id,
        params: [ increaseMs ]
      })
      // then mine block
      .then(() => {
        return this.mineBlock(id + 1)
      })
  }

  async _sendAsync (method, data) {
    const params = Object.assign({
      method,
      jsonrpc: '2.0'
    }, data)

    return this._promisify((params, cb) => {
      // wee nedd to curry the function
      this._web3.currentProvider.sendAsync(params, cb)
    }, params)
  }

  async _promisify (fn, param) {
    return new Promise((resolve, reject) => {
      fn(param, (error, ...data) => {
        if (error) {
          reject(error)
        } else {
          resolve(...data)
        }
      })
    })
  }

  getWeb3 () {
    return this._web3
  }

  _loadContract (contractName, contractsBaseDir) {
    const contractsDir = ROOT_DIR + contractsBaseDir
    const contractJson = require(`${contractsDir}/${contractName}`)
    const contract = truffleContract(contractJson)
    contract.setProvider(this._provider)

    return contract
      .deployed()
      // TODO: Using at <address> depending on the config
      .then(contractInstance => {
        debug('Loaded contract %s. Defaults: %o', contractName, contract.defaults())
        return {
          name: contractName,
          instance: contractInstance
        }
      })
  }
}

module.exports = EthereumClient
