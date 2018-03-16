const loggerNamespace = 'dx-service:repositories:EthereumClient'
const Logger = require('../helpers/Logger')
const numberUtil = require('../helpers/numberUtil')
const logger = new Logger(loggerNamespace)

const Web3 = require('web3')
const truffleContract = require('truffle-contract')
const HDWalletProvider = require('truffle-hdwallet-provider')
const got = require('got')
const ROOT_DIR = '../../'

const environment = process.env.NODE_ENV
const isPro = environment === 'pro'

// See: https://ethgasstation.info/json/ethgasAPI.json
const URL_GAS_PRICE_PROVIDER = 'https://ethgasstation.info/json/ethgasAPI.json'
const DEFAULT_GAS_PRICES = {
  safeLowWait: 5.4,
  safelow_calc: 20,
  fastest: 200,
  fastWait: 0.6,
  average_calc: 40,
  fastestWait: 0.6,
  average_txpool: 30,
  avgWait: 5.4,
  safelow_txpool: 30,
  block_time: 16.596774193548388,
  blockNum: 5258971,
  speed: 0.7752244319000815,
  average: 30,
  safeLow: 30,
  fast: 40
}

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

  async getGasPricesGWei () {
    // In the test nets, we don't have ETH Gas Estation
    let getGasPricePromise
    if (isPro) {
      getGasPricePromise = this._doGetPricesFromFeed()
    } else {
      getGasPricePromise = this._doGetPricesFromWeb3()
    }

    return getGasPricePromise
      // In case of error, return the default (and notify error)
      .catch(error => _handleGetGasPriceError(error))
  }

  async _doGetPricesFromFeed () {
    const gasPriceResponse = await got(URL_GAS_PRICE_PROVIDER, {
      json: true
    })
    console.log('gasPrice', gasPriceResponse.body)

    return _toGasPricesDto(gasPriceResponse.body)
  }

  async _doGetPricesFromWeb3 () {
    const gasPrice = await _promisify(this._web3.eth.getGasPrice)

    return {
      safeLow: gasPrice.div(1e9).mul(0.9).ceil(),
      safeLowWait: DEFAULT_GAS_PRICES.safeLowWait,

      average: gasPrice.div(1e9).ceil(),
      averageWait: DEFAULT_GAS_PRICES.avgWait,

      fast: gasPrice.div(1e9).mul(2).ceil(),
      fastWait: DEFAULT_GAS_PRICES.fastWait
    }
  }

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

function _handleGetGasPriceError (error) {
  // Notify error
  logger.error({
    msg: 'Error getting the price from ETH Gas Station: %s',
    params: [ URL_GAS_PRICE_PROVIDER ],
    error
  })

  // Return fallback default gas price
  return _toGasPricesDto(DEFAULT_GAS_PRICES)
}

function _toGasPricesDto (gasPrices) {
  // De prices are not provided in GWei
  //  * for some reason, they are 10 times bigger than GWei :)
  //  * So 20 y 2GWei

  return {
    safeLow: numberUtil.toBigNumber(gasPrices.safeLow).div(10),
    safeLowWait: gasPrices.safeLowWait,

    average: numberUtil.toBigNumber(gasPrices.average, 10),
    averageWait: gasPrices.avgWait,

    fast: numberUtil.toBigNumber(gasPrices.fast, 10),
    fastWait: gasPrices.fastWait
  }
}

module.exports = EthereumClient
