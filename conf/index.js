const debug = require('debug')('dx-service:conf')
const ENV_VAR_LIST = [
  'ETHEREUM_RPC_URL',
  'DEFAULT_GAS',
  'GAS_PRICE_GWEI',
  'DX_CONTRACT_ADDRESS',
  'BOT_ACCOUNT_MNEMONIC',
  'MINIMUM_SELL_VOLUME_USD'
  // also: <token>_TOKEN_ADDRESS
]
const SPECIAL_TOKENS = ['ETH', 'TUL', 'OWL', 'GNO']

// Get environment: local, dev, pro
let environment = process.env.NODE_ENV.toLowerCase() || 'local'
process.env.NODE_ENV = environment

// Load conf
const defaultConf = require('./config')

// Load env conf
const envConf = require('./env/' + environment + '-config')

// Load network conf
const network = process.env.NETWORK // Optional: RINKEBY, KOVAN
const networkConfig = network ? require(`./network/${network}-config`) : {}

// Get token list and env vars
const markets = envConf.MARKETS || defaultConf.MARKETS
const tokens = getTokenList(markets)
const envVars = getEnvVars(tokens)
// debug('markets: %o', markets)
// debug('tokens: %o', tokens)
// debug('envVars: %o', envVars)

// Merge three configs to get final config
const config = Object.assign({}, defaultConf, envConf, networkConfig, envVars)
config.ERC20_TOKEN_ADDRESSES = getTokenAddresses(tokens, config)

debug('tokens', tokens)
debug('config.ERC20_TOKEN_ADDRESSES', config.ERC20_TOKEN_ADDRESSES)
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
    } else if (config.ENVIRONMENT === 'local') {
      tokenAddresses[token] = null
    } else {
      throw new Error(`The token ${token} is declared in the market, but no \
param ${paramName} was specified. Environemnt: ${config.ENVIRONMENT}`)
    }
    return tokenAddresses
  }, {})
}

// console.log(config)

module.exports = config
