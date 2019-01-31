const CONTRACTS_BASE_DIR = 'build/contracts' // 'node_modules/@gnosis.pm/dx-contracts/build/contracts' // 'build/contracts'
const CONTRACTS_SAFE_MODULE_DIR = 'node_modules/gnosis-safe-modules/build/contracts'

// To enable the SafeModule, please add the properties: Safe, SafeDXCompleteModule, SafeDXSellerModule
// and export their addresses
const CONTRACT_DEFINITIONS = {
  StandardToken: CONTRACTS_BASE_DIR + '/StandardToken',
  DutchExchange: CONTRACTS_BASE_DIR + '/DutchExchange',
  PriceOracleInterface: CONTRACTS_BASE_DIR + '/PriceOracleInterface',
  DutchExchangeProxy: CONTRACTS_BASE_DIR + '/DutchExchangeProxy',
  EtherToken: CONTRACTS_BASE_DIR + '/EtherToken',
  TokenFRT: CONTRACTS_BASE_DIR + '/TokenFRT',
  TokenOWL: CONTRACTS_BASE_DIR + '/TokenOWL',
  TokenOWLProxy: CONTRACTS_BASE_DIR + '/TokenOWLProxy',
  TokenGNO: CONTRACTS_BASE_DIR + '/TokenGNO',
  Safe: CONTRACTS_SAFE_MODULE_DIR + '/GnosisSafe',
  SafeDXCompleteModule: CONTRACTS_SAFE_MODULE_DIR + '/DutchXCompleteModule',
  SafeDXSellerModule: CONTRACTS_SAFE_MODULE_DIR + '/DutchXSellerModule'
}

const SAFE_MODULE_ADDRESSES = {
  SAFE_ADDRESS: '0x2c01003f521698f7625082077d2095a67e3c6723',
  SAFE_COMPLETE_MODULE_CONTRACT_ADDRESS: '0xde5491f774f0cb009abcea7326342e105dbb1b2e',
  SAFE_SELLER_MODULE_CONTRACT_ADDRESS: '0xd54b47f8e6a1b97f3a84f63c867286272b273b7c'
}

module.exports = {
  NETWORK: 'ganache',
  CONTRACTS_BASE_DIR,
  CONTRACT_DEFINITIONS,
  SAFE_MODULE_ADDRESSES
}
