const debug = require('debug')('dx-service:conf')
const LET_ENV_VAR_MARKETS_OVERRIDE_CONFIG = true

const ENV_VAR_LIST = [
  'ETHEREUM_RPC_URL',
  'DEFAULT_GAS',
  'GAS_PRICE_GWEI',
  'DX_CONTRACT_ADDRESS',
  'GNO_TOKEN_ADDRESS',
  'MNEMONIC',
  'MINIMUM_SELL_VOLUME_USD',
  'PUBLIC_API_PORT',
  'PUBLIC_API_HOST'
  //
  // Also:
  //  * NODE_ENV
  //  * MARKETS
  //  * <token>_TOKEN_ADDRESS
  //  * SLACK_API
  //  * SLACK_CHANNEL_BOT_FUNDING
  //  * SLACK_CHANNEL_BOT_TRANSACTIONS
  //  * SLACK_CHANNEL_AUCTIONS_REPORT
  //  * SLACK_CHANNEL_OPERATIONS
]
const SPECIAL_TOKENS = ['WETH', 'MGN', 'OWL', 'GNO']

// Get environment: local, dev, pro
let environment = process.env.NODE_ENV ? process.env.NODE_ENV.toLowerCase() : 'local'
process.env.NODE_ENV = environment === 'test' ? 'local' : environment

// Load conf
const defaultConf = require('./config')

// Load env conf
let envConfFileName
if (environment === 'pre' || environment === 'pro') {
  // PRE and PRO share the same config on porpoise (so they are more alike)
  // differences are modeled just as ENV_VARs
  envConfFileName = 'prepro-config'
} else {
  envConfFileName = environment + '-config'
}
const envConf = require('./env/' + envConfFileName)

// Load network conf
const network = process.env.NETWORK
  ? process.env.NETWORK.toLowerCase()
  : process.env.NETWORK// Optional: RINKEBY, KOVAN
const networkConfig = network ? require(`./network/${network}-config`) : {}

// Get token list and env vars
const envMarkets = LET_ENV_VAR_MARKETS_OVERRIDE_CONFIG ? getEnvMarkets() : null
const markets = envMarkets || envConf.MARKETS || defaultConf.MARKETS
const tokens = getTokenList(markets)
const envVars = getEnvVars(tokens)
debug('markets: %o', markets)
// debug('tokens: %o', tokens)
// debug('envVars: %o', envVars)

// Merge three configs to get final config
const config = Object.assign({}, defaultConf, envConf, networkConfig, envVars, {
  MARKETS: markets
})
config.ERC20_TOKEN_ADDRESSES = getTokenAddresses(tokens, config)

debug('tokens', tokens)
debug('config.ERC20_TOKEN_ADDRESSES', config.ERC20_TOKEN_ADDRESSES)
// debug('config.ERC20_TOKEN_ADDRESSES: \n%O', config.ERC20_TOKEN_ADDRESSES)

function getEnvMarkets () {
  const envMarkets = process.env['MARKETS']
  if (envMarkets) {
    const marketsArray = envMarkets.split(',')
    return marketsArray.map(marketString => {
      const market = marketString.split('-')
      return {
        tokenA: market[0],
        tokenB: market[1]
      }
    })
  } else {
    return null
  }
}

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
