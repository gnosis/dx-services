const Logger = require('./Logger')
const logger = new Logger('dx-service:helpers:HDWalletProvider')

const assert = require('assert')
const Web3 = require('web3')
const TruffleHDWalletProvider = require('truffle-hdwallet-provider')
const sendTxWithUniqueNonce = require('./sendTxWithUniqueNonce')

const environment = process.env.NODE_ENV
const isLocal = environment === 'local'

// Disable the nonce lock:
//    - LOCAL: Disabled by default (true)
//    - DEV/PRE/PRO: Enabled by default (false)
//    - Modificable by env var DISABLE_NONCE_LOCK
const NONCE_LOCK_DISABLED = process.env.DISABLE_NONCE_LOCK === 'true' || isLocal

class HDWalletProvider extends TruffleHDWalletProvider {
  constructor ({
    mnemonic,
    url,
    addressIndex = 0,
    numAddresses = 5,
    shareNonce = true,
    blockForNonceCalculation = 'pending'
  }) {
    assert(mnemonic, '"mnemonic" is mandatory')
    assert(url, '"url" is mandatory')

    // console.log('[HDWalletProvider] New provider for: %s', url)
    super(mnemonic, url, addressIndex, numAddresses, shareNonce)
    this._web3 = new Web3(this)
    this._blockForNonceCalculation = blockForNonceCalculation
    this._mainAddress = '0xf17f52151ebef6c7334fad080c5704d77216b732' // this.addresses[0]

    this._operator = '0xf17f52151ebef6c7334fad080c5704d77216b732'
    this._safeAddress = '0x2c01003f521698f7625082077d2095a67e3c6723'
    this._safeModuleAddress = '0xde5491f774f0cb009abcea7326342e105dbb1b2e'
    const truffleContract = require('truffle-contract')
    const safeCompleteABI = require('gnosis-safe-modules/build/contracts/DutchXCompleteModule.json')
    this._safeModule = truffleContract(safeCompleteABI).at(this._safeModuleAddress)
    // logger.debug('Main address: %s', this._mainAddress)
  }

  // returns the address of the given address_index, first checking the cache

  getAccounts () {
    console.log("#### getAccounts Provider")
    return this._safeAddress
  }
  getAddress (idx) {
    console.log("#### getAddress")
    return this._safeAddress
  }

  // returns the addresses cache
  getAddresses () {
    console.log("#### getAddresses")
    return [this._safeAddress];
  }

  getNonce (from) {
    return new Promise((resolve, reject) => {
      this._web3.eth.getTransactionCount(this._operator, this._blockForNonceCalculation, (error, nonce) => {
        if (error) {
          // console.error('[HDWalletProvider] Error getting the nonce')
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
    let newParams, newRequest

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

    //console.log(arguments)

    // if (method === 'eth_call') {
    //   console.log(JSON.stringify(arguments, null, 4));
    // }

    // if (method === 'eth_estimateGas') {
    //   //arguments['1'] = console.log
    //   return arguments['1']({ jsonrpc: '2.0', result: '0x493e0' })
    // }

    if (method === 'eth_sendTransaction') {
      const moduleData = this._safeModule.contract.executeWhitelisted.getData(params[0].to, params[0].value, params[0].data)
      newParams = {
        'from': this._operator,
        'to': this._safeModule.address,
        'value': 0,
        'data': moduleData,
        'gas': 300000
      }

      arguments['0'].params[0] = newParams

      console.log(JSON.stringify(arguments, null, 4))
      console.log(params)

      if (!NONCE_LOCK_DISABLED) {
        this._sendTxWithUniqueNonce(...arguments)
      } else {
        logger.trace('Send transaction: %o', arguments)
        return super.sendAsync(...arguments)
      }
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
      from: from || this._mainAddress,
      getNonceFn: () => this.getNonce(from),
      sendTransaction: nonce => {
        const nonceHex = '0x' + nonce.toString(16)
        logger.debug('Got nonce %d (%s) for account %s', nonce, nonceHex, from)
        if (Array.isArray(params)) {
          params[0].nonce = nonceHex
        } else {
          params.nonce = nonceHex
        }
        // logger.info('Send transaction with params %O', params)
        // console.log('[HDWalletProvider] Params: %O', params)
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

  _sendAsyncWithNonce () {
    return super.sendAsync()
  }

  send () {
    // console.log('[HDWalletProvider] Intercepting send: ', arguments)
    return super.send(...arguments)
  }
}

module.exports = HDWalletProvider
