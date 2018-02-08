// *** Index to load config based in params ***

const ENVIRONMENT = process.env.NODE_ENV || 'LOCAL' // LOCAL, DEV, PRO

const defaultConf = require('./config')

// Get conf by environment
const envConf = require('./env/' + ENVIRONMENT.toLowerCase() + '-config')

// Add conf by ENVIRONMENT params
const argumentsConf = {}
if (process.env.ETHEREUM_RPC_URL !== undefined) {
  argumentsConf.ETHEREUM_RPC_URL = process.env.ETHEREUM_RPC_URL
}
if (process.env.DX_CONTRACT_ADDRESS !== undefined) {
  argumentsConf.DX_CONTRACT_ADDRESS = process.env.DX_CONTRACT_ADDRESS
}
if (process.env.BOT_ACCOUNT_MNEMONIC !== undefined) {
  argumentsConf.BOT_ACCOUNT_MNEMONIC = process.env.BOT_ACCOUNT_MNEMONIC
}
if (process.env.MINIMUM_SELL_VOLUME_USD !== undefined) {
  argumentsConf.MINIMUM_SELL_VOLUME_USD = process.env.MINIMUM_SELL_VOLUME_USD
}

const SPECIAL_TOKENS = ['ETH', 'TUL', 'OWL', 'GNO']
const MARKETS = envConf.MARKETS || defaultConf.MARKETS

let tokens = MARKETS.reduce((acc, {tokenA, tokenB}) => {
  if (acc.indexOf(tokenA) === -1 && SPECIAL_TOKENS.indexOf(tokenA) === -1) {
    acc.push(tokenA)
  }
  if (acc.indexOf(tokenB) === -1 && SPECIAL_TOKENS.indexOf(tokenB) === -1) {
    acc.push(tokenB)
  }
  return acc
}, [])

tokens.map(token => {
  console.log('Detected tokens in market: ', token)
  if (process.env[token + '_TOKEN_ADDRESS']) {
    argumentsConf[token + '_TOKEN_ADDRESS'] = process.env[token + '_TOKEN_ADDRESS']
  }
})

// Merge three configs to get final config
const config = Object.assign(defaultConf, envConf, argumentsConf)

// console.log(config)

module.exports = config
