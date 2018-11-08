let auctionRepo

module.exports = async () => {
  if (!auctionRepo) {
    auctionRepo = await _createAuctionRepo()
  }
  return auctionRepo
}

async function _createAuctionRepo () {
  const assert = require('assert')
  const path = require('path')
  const conf = require('../../../conf')
  const loadContracts = require('../../loadContracts')
  const getEthereumClient = require('../../getEthereumClient')
  const auctionRepoConf = conf.AUCTION_REPO
  assert(auctionRepoConf, '"AUCTION_REPO" was not defined in the conf')
  
  const { factory } = auctionRepoConf
  assert(factory, '"factory" is required in AUCTION_REPO config')
  
  const auctionRepoPath = path.join('../../..', factory)
  console.log(auctionRepoPath)
  const AuctionRepo = require(auctionRepoPath)
  
  const contracts = await loadContracts()
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

  return new AuctionRepo({
    ethereumClient,
    contracts,

    // Cache
    cache: CACHE,

    // Gas price
    defaultGas: DEFAULT_GAS,
    gasPriceDefault: DEFAULT_GAS_PRICE_USED,

    // Retry logic
    transactionRetryTime: TRANSACTION_RETRY_TIME,
    gasRetryIncrement: GAS_RETRY_INCREMENT,
    overFastPriceFactor: OVER_FAST_PRICE_FACTOR,
    gasEstimationCorrectionFactor: GAS_ESTIMATION_CORRECTION_FACTOR,

    // Override config
    ...auctionRepoConf
  })
}
