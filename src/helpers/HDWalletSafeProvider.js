const assert = require('assert')
const truffleContract = require('truffle-contract')
const TruffleHDWalletProvider = require('truffle-hdwallet-provider')
const Web3 = require('web3')

const Logger = require('./Logger')
const sendTxWithUniqueNonce = require('./sendTxWithUniqueNonce')

const environment = process.env.NODE_ENV
const isLocal = environment === 'local'

const logger = new Logger('dx-service:helpers:HDWalletSafeProvider')

// TODO
// Figure out if we can create a base HDWalletProvider class with common methods for all providers
// like getNonce 

// Disable the nonce lock:
//    - LOCAL: Disabled by default (true)
//    - DEV/PRE/PRO: Enabled by default (false)
//    - Modificable by env var DISABLE_NONCE_LOCK
const NONCE_LOCK_DISABLED = process.env.DISABLE_NONCE_LOCK === 'true' || isLocal

class HDWalletSafeProvider extends TruffleHDWalletProvider {

  constructor ({
    mnemonic,
    url,
    addressIndex = 0,
    numAddresses = 5,
    shareNonce = true,
    blockForNonceCalculation = 'pending',
    operator, // User account that is gonna send transactions
    safeAddress,
    safeModuleAddress,
    safeModuleMode = 'complete', // Use complete safe-module by default
    defaultGas = 300000
  }) {
    assert(mnemonic, '"mnemonic" is mandatory')
    assert(url, '"url" is mandatory')
    assert(safeAddress, '"safeAddress" is mandatory for running in Safe mode')
    assert(safeModuleAddress, '"safeModuleAddress" is mandatory for running in Safe mode')

    super(mnemonic, url, addressIndex, numAddresses, shareNonce)
    this._blockForNonceCalculation = blockForNonceCalculation
    this._defaultGas = defaultGas
    this._operator = operator || this.addresses[addressIndex] // use 1st account in HDWallet
    this._safeAddress = safeAddress
    this._safeModuleAddress = safeModuleAddress
    this._safeModuleMode = safeModuleMode
    this._web3 = new Web3(this)
  }

  loadSafeModule () {
    let moduleABI
    if (this.safeModuleMode == 'seller') {
      moduleABI = require('gnosis-safe-modules/build/contracts/DutchXSellerModule.json')
    } else {
      moduleABI = require('gnosis-safe-modules/build/contracts/DutchXCompleteModule.json')
    }

    this._safeModule = truffleContract(moduleABI).at(this._safeModuleAddress)
  }

  /**
  * @returns {string} account in the HD list of addresses specified by the provided index
  */
  getHDAccount (accountIndex ) {
    return this.addresses[accountIndex]
  }

  // Force return the Safe address
  getAccounts () {
    return [this._safeAddress]
  }

  // Force return the Safe address
  getAddress (idx) {
    return this._safeAddress
  }

  // Force return the Safe address
  getAddresses () {
    return [this._safeAddress]
  }

  // Force getNonce to return operator's nonce
  // TODO figure out if getNonce gets called only within this class, in that case we wouldn't
  // need to force calling  getTransactionCount with this._operator), we would use simply 'from' instead
  getNonce (from) {
    return new Promise((resolve, reject) => {
      this._resetNonceCache()
      this._web3.eth.getTransactionCount(this._operator, this._blockForNonceCalculation, (error, nonce) => {
        if (error) {
          logger.debug('Error getting the nonce', error)
          reject(error)
        } else {
          // logger.debug('Got nonce %d (%s) for account %s', nonce, nonceHex, from)
          resolve(nonce)
        }
      })
    })
  }

  sendAsync (args) {
    /*
    { jsonrpc: '2.0',
      id: 23,
      method: 'eth_sendTransaction',
      params:
       [ { from: '0x2c01003f521698f7625082077d2095a67e3c6723',
           value: '0x38d7ea4c68000',
           to: '0xf25186b5081ff5ce73482ad761db0eb0d25abfbf',
           data: '0xd0e30db0' } ] }

     { '0':
        { jsonrpc: '2.0',
          id: 1,
          method: 'web3_clientVersion',
          params: [] },
       '1': [Function] }
    */

    let method = args.method
    let params = args.params
    let newParams

    if (!method) {
      if (Array.isArray(args) && args.length > 0) {
        method = args[0].method
      } else {
        console.error('Unknown method for: %s', arguments)
      }
    }

    if (!params) {
      if (Array.isArray(args) && args.length > 0) {
        params = args[0].params
      } else {
        console.error('Unknown method for: %s', arguments)
      }
    }

    if (method === 'eth_sendTransaction') {
      // Get Safe Module contract data
      const moduleData = this._safeModule.contract.executeWhitelisted.getData(params[0].to, params[0].value, params[0].data)
      newParams = {
        'from': this._operator,
        'to': this._safeModule.address,
        'value': 0,
        'data': moduleData,
        'gas': this._defaultGas
      }
      // Rewrite arguments
      arguments['0'].params[0] = newParams

      if (!NONCE_LOCK_DISABLED) {
        this._sendTxWithUniqueNonce(...arguments)
      } else {
        logger.trace('Send transaction: %o', arguments)
        this._resetNonceCache()
        return super.sendAsync(...arguments)
      }
    } else if (method === 'eth_accounts') {
      // return safe address
      // arguments['1'] is the callback function setted up by _promisify()
      return arguments['1'](null, {
        "id": 21,
        "jsonrpc": "2.0",
        "result": [this._safeAddress]
      })

    } else {
      logger.trace('Do async call "%s": %o', method, args)
      return super.sendAsync(...arguments)
    }
  }

  _sendTxWithUniqueNonce (args) {
    let { params } = args
    const [ , callback ] = arguments
    let from
    if (Array.isArray(params)) {
      from = params[0].from
    } else {
      from = params.from
    }

    sendTxWithUniqueNonce({
      from: from || this._operator,
      getNonceFn: () => this.getNonce(from),
      sendTransaction: nonce => {
        const nonceHex = '0x' + nonce.toString(16)
        logger.debug('Got nonce %d (%s) for account %s', nonce, nonceHex, from)
        if (Array.isArray(params)) {
          params[0].nonce = nonceHex
        } else {
          params.nonce = nonceHex
        }

        const sendParams = Object.assign({}, args, { params })
        logger.debug('Send transaction with unique nonce: %o', sendParams)

        return new Promise((resolve, reject) => {
          super.sendAsync(sendParams, (error, result) => {
            if (error) {
              reject(error)
              if (callback) {
                callback(error, null)
              }
            }
            resolve(result)
            callback(null, result)
          })
        })
      }
    })
  }

  _resetNonceCache () {
    const nonceProvider = this.engine._providers.find(provider => {
      return provider.hasOwnProperty('nonceCache')
    })
    if (nonceProvider === undefined) {
      throw new Error('Unexpected providers setup. Review the HDWalletProvider setup')
    }
    nonceProvider.nonceCache = {}
  }

}

module.exports = HDWalletSafeProvider
