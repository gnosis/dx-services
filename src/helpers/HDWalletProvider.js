const Logger = require('./Logger')
const logger = new Logger('dx-service:helpers:HDWalletProvider')

const TruffleHDWalletProvider = require('truffle-hdwallet-provider')
const sendTxWithUniqueNonce = require('./sendTxWithUniqueNonce')
const Web3 = require('web3')

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

  getNonce () {
    return new Promise((resolve, reject) => {
      this._web3.eth.getTransactionCount(this._address, this._blockForNonceCalculation, (error, nonce) => {
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

  sendAsync (params) {
    let options
    if (Array.isArray(params)) {
      options = params[0]
    } else {
      options = params
    }
    // console.log('[HDWalletProvider] Intercepting sendAsync: ', arguments)
    const { method } = options
    // console.log('[HDWalletProvider] Intercepting sendAsync - Method: %s', method)
    if (method === 'eth_sendTransaction') {
      const [, callback] = arguments
      // console.log('[HDWalletProvider] Send transaction params: ', options.params)
      sendTxWithUniqueNonce({
        from: this._address,
        getNonceFn: () => this.getNonce(),
        sendTransaction: nonce => {
          logger.debug('Using nonce: %d', nonce)
          options.params.nonce = nonce
          // console.log('[HDWalletProvider] Params: %O', options)
          return super.sendAsync(options, callback)
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
