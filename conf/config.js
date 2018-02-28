const ENVIRONMENT = 'local'

const MINIMUM_SELL_VOLUME_USD = 1000
const MARKETS = [
  { tokenA: 'ETH', tokenB: 'RDN' },
  { tokenA: 'ETH', tokenB: 'OMG' }
]
const BUY_THRESHOLDS = [{
  marketPriceRatio: 1,
  buyRatio: 1 / 3
}, {
  marketPriceRatio: 0.98,
  buyRatio: 2 / 3
}, {
  marketPriceRatio: 0.96,
  buyRatio: 1
}]

const DEFAULT_GAS = 6700000
const GAS_PRICE_GWEI = 100

const ETHEREUM_RPC_URL = 'http://127.0.0.1:8545'
const MNEMONIC = 'candy maple cake sugar pudding cream honey rich smooth crumble sweet treat'
// const MNEMONIC = null

const API_PORT = 8080
const API_HOST = '0.0.0.0'

// contracts
const CONTRACTS_BASE_DIR = 'build/contracts'
const CONTRACTS_DUTCH_EXCHANGE_DIR = 'node_modules/@gnosis.pm/dutch-exchange/build/contracts'
const CONTRACT_DEFINITIONS = {
  StandardToken: CONTRACTS_DUTCH_EXCHANGE_DIR + '/StandardToken',
  DutchExchange: CONTRACTS_DUTCH_EXCHANGE_DIR + '/DutchExchange',
  PriceOracleInterface: CONTRACTS_DUTCH_EXCHANGE_DIR + '/PriceOracleInterface',
  DutchExchangeProxy: CONTRACTS_DUTCH_EXCHANGE_DIR + '/Proxy',
  EtherToken: CONTRACTS_DUTCH_EXCHANGE_DIR + '/EtherToken',
  TokenTUL: CONTRACTS_DUTCH_EXCHANGE_DIR + '/TokenTUL',
  TokenOWL: CONTRACTS_DUTCH_EXCHANGE_DIR + '/TokenOWL',
  TokenOWLProxy: CONTRACTS_DUTCH_EXCHANGE_DIR + '/TokenOWLProxy',
  TokenGNO: CONTRACTS_DUTCH_EXCHANGE_DIR + '/TokenGNO'
}

const DX_CONTRACT_ADDRESS = null
const RDN_TOKEN_ADDRESS = null
const OMG_TOKEN_ADDRESS = null

// Kraken custom config
const KRAKEN = {
  url: 'https://api.kraken.com',
  version: '0'
}

const AUCTION_REPO_IMPL = 'mock' // mock, impl
const ETHEREUM_REPO_IMPL = 'impl' // mock. impl

module.exports = {
  ENVIRONMENT,

  // bot config
  MINIMUM_SELL_VOLUME_USD,
  BUY_THRESHOLDS,
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

  // CONTRACTS
  RDN_TOKEN_ADDRESS,
  OMG_TOKEN_ADDRESS,
  DX_CONTRACT_ADDRESS,

  // API
  API_PORT,
  API_HOST,

  // Exchanges
  KRAKEN
}
