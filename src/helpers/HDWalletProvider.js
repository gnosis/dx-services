const Logger = require('./Logger')
const logger = new Logger('dx-service:helpers:HDWalletProvider')

const TruffleHDWalletProvider = require('truffle-hdwallet-provider')
const sendTxWithUniqueNonce = require('./sendTxWithUniqueNonce')
const Web3 = require('web3')

const environment = process.env.NODE_ENV
const isLocal = environment === 'local'

class HDWalletProvider extends TruffleHDWalletProvider {
  constructor ({
    mnemonic,
    url,
    addressIndex = 0,
    numAddresses = 5,
    shareNonce = true,
    blockForNonceCalculation = 'pending'
  }) { // latest
    // console.log('[HDWalletProvider] New provider for: %s', url)
    super(mnemonic, url, addressIndex, numAddresses, shareNonce)
    this._web3 = new Web3(this)
    this._blockForNonceCalculation = blockForNonceCalculation
  }

  getNonce (from) {
    return new Promise((resolve, reject) => {
      this._web3.eth.getTransactionCount(from, this._blockForNonceCalculation, (error, nonce) => {
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
    // logger.debug('Send transaction: %o', args)
    let { method, params } = args
    if (method === 'eth_sendTransaction' && !isLocal) {
      const [, callback] = arguments
      let from
      if (Array.isArray(params)) {
        from = params[0].from
      } else {
        from = params.from
      }
      // console.log('[HDWalletProvider] Send transaction params: ', options)
      sendTxWithUniqueNonce({
        from,
        getNonceFn: () => this.getNonce(from),
        sendTransaction: nonce => {
          const nonceHex = '0x' + nonce.toString(16)
          logger.info('Got nonce %d (%s) for account %s', nonce, nonceHex, from)
          if (Array.isArray(params)) {
            params[0].nonce = nonceHex
          } else {
            params.nonce = nonceHex
          }
          logger.info('Send transaction with params %O', params)
          // console.log('[HDWalletProvider] Params: %O', params)
          const sendParams = Object.assign({}, args, { params })
          logger.debug('Send transaction with unique nonce: %o', sendParams)
          return super.sendAsync(sendParams, callback)
        }
      })
    } else {
      logger.debug('Send transaction: %o', arguments)
      return super.sendAsync(...arguments)
    }
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
