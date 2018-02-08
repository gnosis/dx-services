// const debug = require('debug')('dx-service:conf')
const ENV_VAR_LIST = [
  'ETHEREUM_RPC_URL',
  'DX_CONTRACT_ADDRESS',
  'BOT_ACCOUNT_MNEMONIC',
  'MINIMUM_SELL_VOLUME_USD'
  // also: <token>_TOKEN_ADDRESS
]
const SPECIAL_TOKENS = ['ETH', 'TUL', 'OWL', 'GNO']

// Load conf
const environment = process.env.NODE_ENV || 'LOCAL' // LOCAL, DEV, PRO
const defaultConf = require('./config')
const envConf = require('./env/' + environment.toLowerCase() + '-config')
const markets = envConf.MARKETS || defaultConf.MARKETS

// Get token list and env vars
const tokens = getTokenList(markets)
const envVars = getEnvVars(tokens)
// debug('markets: %o', markets)
// debug('tokens: %o', tokens)
// debug('envVars: %o', envVars)

// Merge three configs to get final config
const config = Object.assign({}, defaultConf, envConf, envVars)
config.ERC20_TOKEN_ADDRESSES = getTokenAddresses(tokens, config)
// debug('config.ERC20_TOKEN_ADDRESSES: \n%O', config.ERC20_TOKEN_ADDRESSES)

function getTokenList (markets) {
  const result = []

  function isSpecialToken (token) {
    return SPECIAL_TOKENS.indexOf(token) !== -1
  }

  function addToken (token) {
    if (!result.includes(token) && !isSpecialToken(token)) {
      result.push(token)
    }
  }

  markets.forEach(({ tokenA, tokenB }) => {
    addToken(tokenA)
    addToken(tokenB)
  })

  return result
}

function getTokenAddresParamName (token) {
  return `${token}_TOKEN_ADDRESS`
}

function getEnvVars (tokens) {
  const envVarList = ENV_VAR_LIST.concat(
    // Token addresses env vars
    tokens.map(token => getTokenAddresParamName(token))
  )

  return envVarList.reduce((envVars, envVar) => {
    const value = process.env[envVar]
    if (value !== undefined) {
      envVars[envVar] = value
    }

    return envVars
  }, {})
}

function getTokenAddresses (tokens, config) {
  return tokens.reduce((tokenAddresses, token) => {
    const paramName = getTokenAddresParamName(token)
    const address = config[paramName]
    if (address) {
      tokenAddresses[token] = address
    }
    return tokenAddresses
  }, {})
}

// console.log(config)

module.exports = config
