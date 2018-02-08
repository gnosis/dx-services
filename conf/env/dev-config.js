const ENVIRONMENT = 'DEV'

const MINIMUM_SELL_VOLUME_USD = 1000

const DX_CONTRACT_ADDRESS = ''

const MARKETS = {
  'RDN': 'ETH',
  'OMG': 'ETH'
}

const RDN_TOKEN_ADDRESS = ''
const OMG_TOKEN_ADDRESS = ''

const ETHEREUM_RPC_URL = 'http://127.0.0.1:8545'
const BOT_ACCOUNT_MNEMONIC = 'candy maple cake sugar pudding cream honey rich smooth crumble sweet treat'

// *** Specific Develop config ***
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

module.exports = {
  ENVIRONMENT,
  MINIMUM_SELL_VOLUME_USD,
  DX_CONTRACT_ADDRESS,
  MARKETS,

  // CONTRACTS
  RDN_TOKEN_ADDRESS,
  OMG_TOKEN_ADDRESS,

  CONTRACT_DEFINITIONS,
  CONTRACTS_BASE_DIR, // Just used for development

  // Ethereum config
  ETHEREUM_RPC_URL,
  BOT_ACCOUNT_MNEMONIC
}
