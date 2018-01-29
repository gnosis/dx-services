// TODO;
//  * Instead of this config being static, Initialized the config
//  * Rename the const and add the 'DEFAULT_' prefix
//  * Override defaults with arguments and environent vars
//  * Add environent config

const MARKETS = {
  'RDN': 'ETH',
  'OMG': 'ETH'
}

const MINIMUM_SELL_VOLUME_USD = 1000

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

const JSON_RPC_PROVIDERS = {
  // ganache GUI
  'ganache': 'http://127.0.0.1:7545',

  // ganache-cli
  'ganache-cli': 'http://127.0.0.1:8545',

  // truffle develop
  'truffle': 'http://127.0.0.1:9545',

  // parity --chain dev
  // parity --chain kovan --mode active
  'parity': 'http://127.0.0.1:8545'

}
const JSON_RPC_PROVIDER = 'ganache-cli'

const ETHEREUM_JSON_RPC_PROVIDER = JSON_RPC_PROVIDERS[JSON_RPC_PROVIDER]
const WALLET_MNEMONIC = 'candy maple cake sugar pudding cream honey rich smooth crumble sweet treat'

const AUCTION_REPO_IMPL = 'mock' // mock, ethereum
const CONTRACTS_BASE_DIR = 'build/contracts'
const CONTRACTS_DUTCH_EXCHANGE_DIR = 'node_modules/@gnosis.pm/dutch-exchange/build/contracts'

// Kraken custom config
const KRAKEN = {
  url: 'https://api.kraken.com',
  version: '0'
}

/*
TODO: Define the minimun config required to trade

const BUY_TOKENS_KEYS =
const CONTRACT_XXXXX_ADDRESS =
const CONTRACT_YYYYY_ADDRESS =
*/

const API_PORT = 8080
const API_HOST = '0.0.0.0'

module.exports = {
  // bot config
  MARKETS,
  MINIMUM_SELL_VOLUME_USD,
  BUY_THRESHOLDS,

  // Ethereum config
  ETHEREUM_JSON_RPC_PROVIDER,
  WALLET_MNEMONIC,

  // REPO
  AUCTION_REPO_IMPL,
  CONTRACTS_BASE_DIR,
  CONTRACTS_DUTCH_EXCHANGE_DIR,

  // API
  API_PORT,
  API_HOST,

  // Exchanges
  KRAKEN
}
