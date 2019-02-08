const CONTRACTS_BASE_DIR = 'build/contracts' // 'node_modules/@gnosis.pm/dx-contracts/build/contracts' // 'build/contracts'
const CONTRACTS_ARBITRAGE_DIR = 'node_modules/@okwme/arbitrage/build/contracts'
const CONTRACT_DEFINITIONS = {
  ArbitrageContract: CONTRACTS_ARBITRAGE_DIR + '/Arbitrage', //BILLY: CHECK THIS
  UniswapFactory: CONTRACTS_ARBITRAGE_DIR + '/IUniswapFactory', //BILLY: CHECK THIS
  UniswapExchange: CONTRACTS_ARBITRAGE_DIR + '/IUniswapExchange', //BILLY: CHECK THIS

  StandardToken: CONTRACTS_BASE_DIR + '/StandardToken',
  DutchExchange: CONTRACTS_BASE_DIR + '/DutchExchange',
  PriceOracleInterface: CONTRACTS_BASE_DIR + '/PriceOracleInterface',
  DutchExchangeProxy: CONTRACTS_BASE_DIR + '/DutchExchangeProxy',
  UniToken: CONTRACTS_BASE_DIR + '/EtherToken',
  EtherToken: CONTRACTS_BASE_DIR + '/EtherToken',
  TokenFRT: CONTRACTS_BASE_DIR + '/TokenFRT',
  TokenOWL: CONTRACTS_BASE_DIR + '/TokenOWL',
  TokenOWLProxy: CONTRACTS_BASE_DIR + '/TokenOWLProxy',
  TokenGNO: CONTRACTS_BASE_DIR + '/TokenGNO'
}

module.exports = {
  NETWORK: 'ganache',
  CONTRACTS_BASE_DIR,
  CONTRACT_DEFINITIONS,
  UNI_TOKEN_ADDRESS: '0x8273e4B8ED6c78e252a9fCa5563Adfcc75C91b2A'
}
