const loggerNamespace = 'dx-service:repositories:EthereumClient'
const Logger = require('../helpers/Logger')
const logger = new Logger(loggerNamespace)

const Web3 = require('web3')
const truffleContract = require('truffle-contract')
const HDWalletProvider = require('truffle-hdwallet-provider')
const ROOT_DIR = '../../'

// TODO: Check eventWatcher in DX/test/utils.js

class EthereumClient {
  constructor ({ url = 'http://127.0.0.1:8545', mnemonic = null, contractsBaseDir = 'build/contracts' }) {
    logger.debug('Using %s RPC api to connect to Ethereum', url)
    this._url = url
    if (mnemonic) {
      this._provider = new HDWalletProvider(mnemonic, url, 0, 5)
      this._provider.engine.on('error', error => {
        logger.error({
          msg: 'Error in Web3 engine: ' + error.toString(),
          error
        })
      })
    } else {
      this._provider = new Web3.providers.HttpProvider(url)
    }

    this._web3 = new Web3(this._provider)
    this._contractCache = {}
    this._contractsBaseDir = contractsBaseDir
  }

  getUrl () {
    return this._url
  }

  /*
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
  */

  async getBlock (blockNumber) {
    if (!blockNumber) {
      blockNumber = await this.getBlockNumber()
    }
    return _promisify(this._web3.eth.getBlock, blockNumber)
  }

  async getAccounts () {
    return this.doCall('eth.getAccounts')
  }

  async getBlockNumber () {
    return this.doCall('eth.getBlockNumber')
  }

  async geLastBlockTime () {
    // const blockNumber = this.getBlockNumber()
    // return this._promisify(this._web3.eth.getBlock, blockNumber)
    return this.getBlock()
      .then(block => new Date(block.timestamp * 1000))
  }

  async balanceOf (account) {
    return this.doCall('eth.getBalance', account)
  }

  async doCall (propName, params) {
    const propPath = propName.split('.')
    // const callFn = this._getCallFn(this._web3, propPath)
    const callClass = this._getCallFn(this._web3, propPath)
    const methodName = propPath[propPath.length - 1]
    return _promisify(callClass[methodName], params) // TODO: Review promisify extra params
  }

  _getCallFn (currentObject, [head, ...tail]) {
    const nextObject = currentObject[head]
    if (tail.length === 1) {
      return nextObject
    } else {
      return this._getCallFn(nextObject, tail)
    }

    /*
    const nextObject = currentObject[head]
    if (tail.length === 0) {
      nextObject.bind(currentObject)
      return nextObject
    } else {
      return this._getCallFn(nextObject, tail)
    }
    */
  }

  async getSyncing () {
    return _promisify(this._web3.eth.getSyncing)
  }

  async mineBlock (id = new Date().getTime()) {
    return this._sendAsync('evm_mine', { id })
  }

  // Returns an snapshotId
  async makeSnapshot () {
    return this._sendAsync('evm_snapshot')
      .then(snapshot => { return snapshot.result })
  }

  async revertSnapshot (snapshotId) {
    const params = snapshotId ? [snapshotId] : []
    return this._sendAsync('evm_revert', { params: params })
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

    return _promisify((params, cb) => {
      // wee nedd to curry the function
      this._web3.currentProvider.sendAsync(params, cb)
    }, params)
  }

  getWeb3 () {
    return this._web3
  }

  loadContract (contractDefinitionPath) {
    const contractJson = require(ROOT_DIR + contractDefinitionPath)
    const contract = truffleContract(contractJson)
    contract.setProvider(this._provider)

    return contract
  }

  /*
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
  */
}

async function _promisify (fn, param) {
  return new Promise((resolve, reject) => {
    const callback = (error, data) => {
      if (error) {
        reject(error)
      } else {
        resolve(data)
      }
    }

    if (param) {
      fn(param, callback)
    } else {
      fn(callback)
    }
  })
}

module.exports = EthereumClient
