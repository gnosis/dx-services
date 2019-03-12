const CONTRACTS_BASE_DIR = 'build/contracts' // 'node_modules/@gnosis.pm/dx-contracts/build/contracts' // 'build/contracts'

const CONTRACT_DEFINITIONS = {
  GnosisStandardToken: CONTRACTS_BASE_DIR + '/GnosisStandardToken',
  DutchExchange: CONTRACTS_BASE_DIR + '/DutchExchange',
  PriceOracleInterface: CONTRACTS_BASE_DIR + '/PriceOracleInterface',
  DutchExchangeProxy: CONTRACTS_BASE_DIR + '/DutchExchangeProxy',
  DutchExchangeHelper: CONTRACTS_BASE_DIR + '/DutchExchangeHelper',
  EtherToken: CONTRACTS_BASE_DIR + '/EtherToken',
  TokenFRT: CONTRACTS_BASE_DIR + '/TokenFRT',
  TokenFRTProxy: CONTRACTS_BASE_DIR + '/TokenFRTProxy',
  TokenOWL: CONTRACTS_BASE_DIR + '/TokenOWL',
  TokenOWLProxy: CONTRACTS_BASE_DIR + '/TokenOWLProxy',
  TokenGNO: CONTRACTS_BASE_DIR + '/TokenGNO'
}

module.exports = {
  NETWORK: 'ganache',
  CONTRACTS_BASE_DIR,
  CONTRACT_DEFINITIONS
}
