const ENVIRONMENT = 'local'

// const MARKETS = [
//   { tokenA: 'WETH', tokenB: 'RDN' }
// ]

const MNEMONIC = 'candy maple cake sugar pudding cream honey rich smooth crumble sweet treat'

const CONTRACTS_BASE_DIR = 'build/contracts' // 'node_modules/@gnosis.pm/dx-contracts/build/contracts' // 'build/contracts'
const CONTRACT_DEFINITIONS = {
  StandardToken: CONTRACTS_BASE_DIR + '/StandardToken',
  DutchExchange: CONTRACTS_BASE_DIR + '/DutchExchange',
  PriceOracleInterface: CONTRACTS_BASE_DIR + '/PriceOracleInterface',
  DutchExchangeProxy: CONTRACTS_BASE_DIR + '/DutchExchangeProxy',
  EtherToken: CONTRACTS_BASE_DIR + '/EtherToken',
  TokenFRT: CONTRACTS_BASE_DIR + '/TokenFRT',
  TokenOWL: CONTRACTS_BASE_DIR + '/TokenOWL',
  TokenOWLProxy: CONTRACTS_BASE_DIR + '/TokenOWLProxy',
  TokenGNO: CONTRACTS_BASE_DIR + '/TokenGNO'
}

module.exports = {
  ENVIRONMENT,
  // MARKETS,
  MNEMONIC,
  CONTRACT_DEFINITIONS
}
