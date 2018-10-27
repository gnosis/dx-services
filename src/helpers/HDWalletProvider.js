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
    this._address = this.addresses[0]
    this._blockForNonceCalculation = blockForNonceCalculation
    // console.log('[HDWalletProvider] Wallet address: ', this._address)
  }

  getNonce (from) {
    return new Promise((resolve, reject) => {
      this._web3.eth.getTransactionCount(from, this._blockForNonceCalculation, (error, nonce) => {
        if (error) {
          // console.error('[HDWalletProvider] Error getting the nonce')
          reject(error)
        } else {
          resolve(nonce)
          /*
          console.log('[HDWalletProvider] Using nonce: ', nonce)
          options.params.nonce = nonce
          // console.log('[HDWalletProvider] Params: ', params)
          return super.sendAsync(options, callback)
          */
        }
      })
    })
  }

  sendAsync (args) {
    let { method, params } = args
    // console.log('[HDWalletProvider] Intercepting sendAsync: ', arguments)
    // console.log('[HDWalletProvider] Intercepting sendAsync - Method: %s', method)
    // if (method === 'eth_sendTransaction') {
    //   console.log(args)
    // }
    if (method === 'eth_sendTransaction' && !isLocal) {
      const [, callback] = arguments
      let from
      if (Array.isArray(params)) {
        from = params[0].from
      } else {
        from = params.nonce
      }
      // console.log('[HDWalletProvider] Send transaction params: ', options)
      sendTxWithUniqueNonce({
        from,
        getNonceFn: () => this.getNonce(from),
        sendTransaction: nonce => {
          logger.debug('Using nonce: %d', nonce)
          if (Array.isArray(params)) {
            params[0].nonce = nonce
          } else {
            params.nonce = nonce
          }
          // console.log('[HDWalletProvider] Params: %O', params)
          const sendParams = Object.assign({}, args, { params })
          return super.sendAsync(sendParams, callback)
        }
      })
    } else {
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
