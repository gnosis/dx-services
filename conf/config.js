const ENVIRONMENT = 'local'

const MARKETS = [
  { tokenA: 'WETH', tokenB: 'RDN' },
  { tokenA: 'WETH', tokenB: 'OMG' }
]
const BUY_LIQUIDITY_RULES_DEFAULT = [
  // Buy 1/2 if price falls below 99%

  {
    marketPriceRatio: {
      numerator: 99,
      denominator: 100
    },
    buyRatio: {
      numerator: 1,
      denominator: 2
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

const MAIN_BOT_ACCOUNT = 0
const BACKUP_BOT_ACCOUNT = 1

const BUY_LIQUIDITY_BOTS = [{
  name: 'Main buyer bot',
  markets: MARKETS,
  accountIndex: MAIN_BOT_ACCOUNT,
  rules: BUY_LIQUIDITY_RULES_DEFAULT,
  notifications: [{
    type: 'slack',
    channel: '' // If none provided uses SLACK_CHANNEL_BOT_TRANSACTIONS
  }],
  checkTimeInMilliseconds: 60 * 1000 // 60s
}, {
  name: 'Backup buyer for RDN-WETH',
  markets: [
    { tokenA: 'WETH', tokenB: 'RDN' }
  ],
  accountIndex: BACKUP_BOT_ACCOUNT,
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
  }],
  notifications: [{
    type: 'slack',
    channel: '' // If none provided uses SLACK_CHANNEL_BOT_TRANSACTIONS
  }, {
    type: 'email',
    email: ''
  }],
  checkTimeInMilliseconds: 60 * 1000, // 60s
  disableHighSellVolumeCheck: true,
  minimumAmountInUsdForToken: 850 // $850
}]

const SELL_LIQUIDITY_BOTS = [{
  name: 'Main seller bot',
  markets: MARKETS,
  accountIndex: MAIN_BOT_ACCOUNT,
  notifications: [{
    type: 'slack',
    channel: '' // If none provided uses SLACK_CHANNEL_BOT_TRANSACTIONS
  }],
  checkTimeInMilliseconds: 60 * 1000 // 60s
}]

// TODO Enable by default in future versions
// const DEPOSIT_BOT = {
//   name: 'Deposit bot',
//   notifications: [{
//     type: 'slack',
//     channel: '' // If none provided uses SLACK_CHANNEL_BOT_TRANSACTIONS
//   }],
//   // You can use this to have some time to manually withdraw funds
//   inactivityPeriods: [{
//     from: '11:30',
//     to: '12:00'
//   }, {
//     from: '15:30',
//     to: '16:00'
//   }],
//   checkTimeInMilliseconds: 5 * 60 * 1000 // 5min
// }

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
  GnosisStandardToken: CONTRACTS_UTILS_DIR + '/GnosisStandardToken',
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
  feeds: ['binance', 'huobi', 'kraken', 'bitfinex', 'hitbtc', 'liquid']
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

const TRANSACTION_RETRY_TIME = 5 * 60 * 1000 // 5 minutes (in miliseconds)
const GAS_RETRY_INCREMENT = 1.2 // (previous_gas * GAS_RETRY_INCREMENT) === increment 20%
const OVER_FAST_PRICE_FACTOR = 1 // (fast_price * OVER_FAST_PRICE_FACTOR) === using maximum the fastest gas price
const GAS_ESTIMATION_CORRECTION_FACTOR = 2 // Gas estimation correction for proxied contract

module.exports = {
  ENVIRONMENT,

  // bot config
  MAIN_BOT_ACCOUNT,
  BUY_LIQUIDITY_BOTS,
  SELL_LIQUIDITY_BOTS,
  // DEPOSIT_BOT,
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
  TRANSACTION_RETRY_TIME,
  GAS_RETRY_INCREMENT,
  OVER_FAST_PRICE_FACTOR,
  GAS_ESTIMATION_CORRECTION_FACTOR,

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
