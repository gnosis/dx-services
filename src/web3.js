const Logger = require('./helpers/Logger')
const logger = new Logger('dx-service:web3')

const assert = require('assert')
const conf = require('../conf')
const Web3 = require('web3')

const HDWalletProvider = require('./helpers/HDWalletProvider')

// We handle this error separatelly, because node throw this error from time to
// time, and it disapears after some seconds
const NODE_ERROR_EMPTY_RESPONSE = 'Error: Invalid JSON RPC response: ""'
const SILENT_TIME_FOR_NODE_ERRORS = 120000 // 120s

const {
  MNEMONIC,
  ETHEREUM_RPC_URL
} = conf

assert(MNEMONIC, 'The "MNEMONIC" is mandatory')
assert(ETHEREUM_RPC_URL, 'The "ETHEREUM_RPC_URL" is mandatory')

// Setup provider and Web3
logger.debug('Using %s RPC api to connect to Ethereum', this._url)
this._provider = new HDWalletProvider({
  mnemonic: MNEMONIC,
  url: ETHEREUM_RPC_URL,
  addressIndex: 0,
  numAddresses: 5
})
this._provider.engine.on('error', _printNodeError)

let reduceWarnLevelForNodeErrors = false
function _printNodeError (error) {
  const errorMessage = error.message
  let debugLevel
  if (errorMessage === NODE_ERROR_EMPTY_RESPONSE) {
    if (reduceWarnLevelForNodeErrors) {
      debugLevel = 'warn'
    } else {
      debugLevel = 'error'
      reduceWarnLevelForNodeErrors = true
      setTimeout(() => {
        reduceWarnLevelForNodeErrors = false
      }, SILENT_TIME_FOR_NODE_ERRORS)
    }
  } else {
    debugLevel = 'error'
  }
  logger[debugLevel]({
    msg: 'Error in Ethereum node %s: %s',
    params: [ this._url, error.message ]
    // error // We hide the stack trace, is not usefull in this case (dispached by web3 internals)
  })
}

module.exports = new Web3(this._provider)
