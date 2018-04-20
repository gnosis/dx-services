const ENVIRONMENT = 'local'

const MINIMUM_SELL_VOLUME_USD = 1000
const MARKETS = [
  { tokenA: 'WETH', tokenB: 'RDN' },
  { tokenA: 'WETH', tokenB: 'OMG' }
]
const BUY_LIQUIDITY_RULES = [
  // Buy 1/3 if price equals market price
  {
    marketPriceRatio: {
      numerator: 1,
      denominator: 1
    },
    buyRatio: {
      numerator: 1,
      denominator: 3
    }
  },

  // Buy 2/3 if price falls below 98%
  {
    marketPriceRatio: {
      numerator: 98,
      denominator: 100
    },
    buyRatio: {
      numerator: 2,
      denominator: 3
    }
  },

  // Buy the 100% if price falls below 96%
  {
    marketPriceRatio: {
      numerator: 96,
      denominator: 100
    },
    buyRatio: {
      numerator: 1,
      denominator: 1
    }
  }
]

const DEFAULT_GAS = 6700000
const GAS_PRICE_GWEI = 100

const ETHEREUM_RPC_URL = 'http://127.0.0.1:8545'
const MNEMONIC = 'candy maple cake sugar pudding cream honey rich smooth crumble sweet treat'
// const MNEMONIC = null

const PUBLIC_API_PORT = 8080
const PUBLIC_API_HOST = '0.0.0.0'
const BOTS_API_PORT = 8081
const BOTS_API_HOST = '0.0.0.0'

// contracts
const CONTRACTS_BASE_DIR = 'build/contracts'
const CONTRACTS_DUTCH_EXCHANGE_DIR = 'node_modules/@gnosis.pm/dutch-exchange-smartcontracts/build/contracts'
const CONTRACT_DEFINITIONS = {
  StandardToken: CONTRACTS_DUTCH_EXCHANGE_DIR + '/StandardToken',
  DutchExchange: CONTRACTS_DUTCH_EXCHANGE_DIR + '/DutchExchange',
  PriceOracleInterface: CONTRACTS_DUTCH_EXCHANGE_DIR + '/PriceOracleInterface',
  DutchExchangeProxy: CONTRACTS_DUTCH_EXCHANGE_DIR + '/Proxy',
  EtherToken: CONTRACTS_DUTCH_EXCHANGE_DIR + '/EtherToken',
  TokenMGN: CONTRACTS_DUTCH_EXCHANGE_DIR + '/TokenMGN',
  TokenOWL: CONTRACTS_DUTCH_EXCHANGE_DIR + '/TokenOWL',
  TokenOWLProxy: CONTRACTS_DUTCH_EXCHANGE_DIR + '/TokenOWLProxy',
  TokenGNO: CONTRACTS_DUTCH_EXCHANGE_DIR + '/TokenGNO'
}

const DX_CONTRACT_ADDRESS = null
const GNO_TOKEN_ADDRESS = null
const RDN_TOKEN_ADDRESS = null
const OMG_TOKEN_ADDRESS = null

// Kraken custom config
const KRAKEN = {
  url: 'https://api.kraken.com',
  version: '0'
}

// Slack
const SLACK_CHANNEL_DX_BOTS_DEV = 'GA5J9F13J'
const SLACK_CHANNEL_BOT_FUNDING = SLACK_CHANNEL_DX_BOTS_DEV
const SLACK_CHANNEL_BOT_TRANSACTIONS = SLACK_CHANNEL_DX_BOTS_DEV
const SLACK_CHANNEL_AUCTIONS_REPORT = SLACK_CHANNEL_DX_BOTS_DEV
const SLACK_CHANNEL_OPERATIONS = SLACK_CHANNEL_DX_BOTS_DEV

// Sentry
const SENTRY_DSN = 'https://471f4b8740094aa0bdd13e08533115b5:67f2a995c8df48bebd64b602a03b722f@sentry.io/302707'

const AUCTION_REPO_IMPL = 'impl' // mock, impl
const ETHEREUM_REPO_IMPL = 'impl' // mock. impl
const EXCHANGE_PRICE_REPO_IMPL = 'impl' // mock. impl

const EXCHANGE_PRICE_FEED_STRATEGIES_DEFAULT = {
  strategy: 'sequence', // TODO: More strategies can be implemented. i.e. averages, median, ponderated volumes, ...
  feeds: ['binance', 'huobi', 'kraken', 'bitfinex']
}

const EXCHANGE_PRICE_FEED_STRATEGIES = {
  'WETH-OMG': {
    strategy: 'sequence',
    feeds: ['binance', 'huobi', 'bitfinex']
  },
  'WETH-RDN': {
    strategy: 'sequence',
    feeds: ['huobi', 'binance', 'bitfinex']
  }
}

module.exports = {
  ENVIRONMENT,

  // bot config
  MINIMUM_SELL_VOLUME_USD,
  BUY_LIQUIDITY_RULES,
  MARKETS,

  // Gas
  DEFAULT_GAS,
  GAS_PRICE_GWEI,

  // Contracts
  CONTRACTS_BASE_DIR,
  CONTRACT_DEFINITIONS,

  // Ethereum config
  ETHEREUM_RPC_URL,
  MNEMONIC,

  // REPO
  AUCTION_REPO_IMPL,
  ETHEREUM_REPO_IMPL,
  EXCHANGE_PRICE_REPO_IMPL,
  EXCHANGE_PRICE_FEED_STRATEGIES_DEFAULT,
  EXCHANGE_PRICE_FEED_STRATEGIES,

  // CONTRACTS
  DX_CONTRACT_ADDRESS,
  GNO_TOKEN_ADDRESS,
  RDN_TOKEN_ADDRESS,
  OMG_TOKEN_ADDRESS,

  // API
  PUBLIC_API_PORT,
  PUBLIC_API_HOST,
  BOTS_API_PORT,
  BOTS_API_HOST,

  // Exchanges
  KRAKEN,

  // SLACK
  SLACK_CHANNEL_BOT_FUNDING,
  SLACK_CHANNEL_BOT_TRANSACTIONS,
  SLACK_CHANNEL_AUCTIONS_REPORT,
  SLACK_CHANNEL_OPERATIONS,

  // ERROR HANDLING
  SENTRY_DSN
}
