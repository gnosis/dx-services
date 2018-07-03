const ENVIRONMENT = 'local'

const MARKETS = [
  { tokenA: 'WETH', tokenB: 'RDN' },
  { tokenA: 'WETH', tokenB: 'OMG' }
]
const BUY_LIQUIDITY_RULES_DEFAULT = [
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

const BUY_LIQUIDITY_BOTS = [{
  name: 'Main buyer bot',
  markets: MARKETS,
  accountIndex: 0,
  rules: BUY_LIQUIDITY_RULES_DEFAULT
}, {
  name: 'Backup buyer for RDN-WETH',
  markets: [
    { tokenA: 'WETH', tokenB: 'RDN' }
  ],
  accountIndex: 1,
  rules: [{
    // Buy the 100% if price falls below 90%
    marketPriceRatio: {
      numerator: 90,
      denominator: 100
    },
    buyRatio: {
      numerator: 1,
      denominator: 1
    }
  }]
}]

const SELL_LIQUIDITY_BOTS = [{
  name: 'Main seller bot',
  markets: MARKETS,
  accountIndex: 0
}]

const AUTO_CLAIM_AUCTIONS = 90

const DEFAULT_GAS = 6700000

const ETHEREUM_RPC_URL = 'http://127.0.0.1:8545'
const MNEMONIC = null

const CACHE_ENABLED = true

const CACHE_TIMEOUT_SHORT = 1
const CACHE_TIMEOUT_AVERAGE = 15
const CACHE_TIMEOUT_LONG = 120

const PUBLIC_API_PORT = 8080
const PUBLIC_API_HOST = '0.0.0.0'
const BOTS_API_PORT = 8081
const BOTS_API_HOST = '0.0.0.0'

// contracts
const CONTRACTS_BASE_DIR = 'build/contracts' // 'node_modules/@gnosis.pm/dx-contracts/build/contracts'
const CONTRACTS_UTILS_DIR = 'node_modules/@gnosis.pm/util-contracts/build/contracts'
const CONTRACTS_GNO_DIR = 'node_modules/@gnosis.pm/gno-token/build/contracts'
const CONTRACTS_OWL_DIR = 'node_modules/@gnosis.pm/owl-token/build/contracts'
const CONTRACTS_DX_DIR = 'node_modules/@gnosis.pm/dx-contracts/build/contracts'

const CONTRACT_DEFINITIONS = {
  StandardToken: CONTRACTS_UTILS_DIR + '/StandardToken',
  EtherToken: CONTRACTS_UTILS_DIR + '/EtherToken',
  TokenGNO: CONTRACTS_GNO_DIR + '/TokenGNO',
  TokenOWL: CONTRACTS_OWL_DIR + '/TokenOWL',
  TokenOWLProxy: CONTRACTS_OWL_DIR + '/TokenOWLProxy',
  TokenFRT: CONTRACTS_DX_DIR + '/TokenFRT',
  PriceOracleInterface: CONTRACTS_DX_DIR + '/PriceOracleInterface',
  DutchExchangeProxy: CONTRACTS_DX_DIR + '/DutchExchangeProxy',
  DutchExchange: CONTRACTS_DX_DIR + '/DutchExchange'
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

// Slack: dx-bots (main)
const SLACK_CHANNEL_DX_BOTS = 'CAEENDQKC'
const SLACK_CHANNEL_BOT_FUNDING = SLACK_CHANNEL_DX_BOTS
const SLACK_CHANNEL_AUCTIONS_REPORT = SLACK_CHANNEL_DX_BOTS

// Slack: dx-bots-dev (dev channel)
const SLACK_CHANNEL_DX_BOTS_DEV = 'GA5J9F13J'
const SLACK_CHANNEL_BOT_TRANSACTIONS = SLACK_CHANNEL_DX_BOTS_DEV
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

const DEFAULT_GAS_PRICE_USED = 'fast'
const URL_GAS_PRICE_FEED_GAS_STATION = null
const URL_GAS_PRICE_FEED_SAFE = null

module.exports = {
  ENVIRONMENT,

  // bot config
  BUY_LIQUIDITY_BOTS,
  SELL_LIQUIDITY_BOTS,
  BUY_LIQUIDITY_RULES_DEFAULT,
  MARKETS,
  AUTO_CLAIM_AUCTIONS,

  // Gas
  DEFAULT_GAS,

  // Contracts
  CONTRACT_DEFINITIONS,
  CONTRACTS_BASE_DIR,

  // Ethereum config
  ETHEREUM_RPC_URL,
  MNEMONIC,

  // REPO
  AUCTION_REPO_IMPL,
  ETHEREUM_REPO_IMPL,
  EXCHANGE_PRICE_REPO_IMPL,
  EXCHANGE_PRICE_FEED_STRATEGIES_DEFAULT,
  EXCHANGE_PRICE_FEED_STRATEGIES,
  DEFAULT_GAS_PRICE_USED,
  URL_GAS_PRICE_FEED_GAS_STATION,
  URL_GAS_PRICE_FEED_SAFE,

  // CONTRACTS
  DX_CONTRACT_ADDRESS,
  GNO_TOKEN_ADDRESS,
  RDN_TOKEN_ADDRESS,
  OMG_TOKEN_ADDRESS,

  // API
  CACHE_ENABLED,
  CACHE_TIMEOUT_SHORT,
  CACHE_TIMEOUT_AVERAGE,
  CACHE_TIMEOUT_LONG,
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
