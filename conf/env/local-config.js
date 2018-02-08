const ENVIRONMENT = 'LOCAL'

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

  CONTRACT_DEFINITIONS,
  CONTRACTS_BASE_DIR, // Just used for development

  // Ethereum config
  ETHEREUM_RPC_URL,
  BOT_ACCOUNT_MNEMONIC
}
