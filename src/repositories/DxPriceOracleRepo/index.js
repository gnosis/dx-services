const conf = require('../../../conf')

let dxPriceOracleRepo

module.exports = async () => {
  if (!dxPriceOracleRepo) {
    dxPriceOracleRepo = await _createDxPriceOracleRepo()
  }
  return dxPriceOracleRepo
}

async function _createDxPriceOracleRepo () {
  // Get factory
  const {
    Factory: DxOraclePriceRepo,
    factoryConf: dxOraclePriceRepoConf
  } = conf.getFactory('DX_PRICE_ORACLE_REPO')

  // Get contracts
  const loadContracts = require('../../loadContracts')
  const contracts = await loadContracts()

  // Get ethereum client
  const getEthereumClient = require('../../getEthereumClient')
  const ethereumClient = await getEthereumClient()

  const {
    CACHE,
    DEFAULT_GAS,
    TRANSACTION_RETRY_TIME,
    GAS_RETRY_INCREMENT,
    OVER_FAST_PRICE_FACTOR,
    GAS_ESTIMATION_CORRECTION_FACTOR,
    DEFAULT_GAS_PRICE_USED
  } = conf

  return new DxOraclePriceRepo({
    ethereumClient,
    contracts,

    // Cache
    cacheConf: CACHE,

    // Gas price
    defaultGas: DEFAULT_GAS,
    gasPriceDefault: DEFAULT_GAS_PRICE_USED,

    // Retry logic
    transactionRetryTime: TRANSACTION_RETRY_TIME,
    gasRetryIncrement: GAS_RETRY_INCREMENT,
    overFastPriceFactor: OVER_FAST_PRICE_FACTOR,
    gasEstimationCorrectionFactor: GAS_ESTIMATION_CORRECTION_FACTOR,

    // Override config
    ...dxOraclePriceRepoConf
  })
}
