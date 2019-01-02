// Base paths
const CONTRACTS_BASE_DIR = 'build/contracts' // 'node_modules/@gnosis.pm/dx-contracts/build/contracts'
const CONTRACTS_UTILS_DIR =
  'node_modules/@gnosis.pm/util-contracts/build/contracts'
const CONTRACTS_GNO_DIR = 'node_modules/@gnosis.pm/gno-token/build/contracts'
const CONTRACTS_OWL_DIR = 'node_modules/@gnosis.pm/owl-token/build/contracts'
const CONTRACTS_DX_DIR = 'node_modules/@gnosis.pm/dx-contracts/build/contracts'

module.exports = {
  // Contracts
  DX_CONTRACT_ADDRESS: null,

  // TODO: Do we need this?
  GNO_TOKEN_ADDRESS: null,

  // TODO: Remove this tokens from conf
  RDN_TOKEN_ADDRESS: null,
  OMG_TOKEN_ADDRESS: null,

  // Base dir
  CONTRACTS_BASE_DIR,

  // Contracts paths
  CONTRACT_DEFINITIONS: {
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
}
