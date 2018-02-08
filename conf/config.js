// TODO;
//  * Instead of this config being static, Initialized the config
//  * Rename the const and add the 'DEFAULT_' prefix
//  * Add environent config: mock, local, rinkeby
//      * npm run app --mock
//      * npm run app --rinkeby
//  * Override defaults with arguments and environent vars. I.e:
//      * npm run app --ethereum-rpc-url=http://localhost:9545
//      * ETHEREUM-RPC-URL=http://localhost:9545 npm run app
//  * minimum, for the 1st iteration, let override:
//      * url
//      * contract addresses
//      * botAddress and mnemonic
//      * para nota MINIMUM_SELL_VOLUME_USD
/*

example: Run in PRE
  ETHEREUM_RPC_URL=<url> \
  DX_CONTRACT_ADDRESS =<add>\
  BOT_ACCOUNT_MNEMONIC=<menmonic>\
  MINIMUM_SELL_VOLUME_USD=1000\
  npm run app
*/

const ENVIRONMENT = 'LOCAL'

const MINIMUM_SELL_VOLUME_USD = 1000

const DX_CONTRACT_ADDRESS = null
// TODO: Implement the aditional token config
const ERC20_TOKEN_ADDRESSES = {
  RDN: null,
  OMG: null
}

const MARKETS = [
  {tokenA: 'ETH', tokenB: 'RDN'},
  {tokenA: 'ETH', tokenB: 'OMG'}
]

const RDN_TOKEN_ADDRESS = null
const OMG_TOKEN_ADDRESS = null

const ETHEREUM_RPC_URL = 'http://127.0.0.1:8545'
const BOT_ACCOUNT_MNEMONIC = 'candy maple cake sugar pudding cream honey rich smooth crumble sweet treat'

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

const AUCTION_REPO_IMPL = 'mock' // mock, ethereum
const ETHEREUM_REPO_IMPL = 'impl' // mock. impl

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
  ENVIRONMENT,

  // bot config
  MINIMUM_SELL_VOLUME_USD,
  BUY_THRESHOLDS,
  MARKETS,

  // Ethereum config
  ETHEREUM_RPC_URL,
  BOT_ACCOUNT_MNEMONIC,

  // REPO
  AUCTION_REPO_IMPL,
  ETHEREUM_REPO_IMPL,

  // CONTRACTS
  RDN_TOKEN_ADDRESS,
  OMG_TOKEN_ADDRESS,
  DX_CONTRACT_ADDRESS,
  ERC20_TOKEN_ADDRESSES,

  // API
  API_PORT,
  API_HOST,

  // Exchanges
  KRAKEN
}
