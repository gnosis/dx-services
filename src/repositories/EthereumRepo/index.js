const conf = require('../../../conf')

let auctionRepo

module.exports = async () => {
  if (!auctionRepo) {
    auctionRepo = await _createEthereumRepo()
  }
  return auctionRepo
}

async function _createEthereumRepo () {
  const {
    Factory: EthereumRepo,
    factoryConf: ethereumRepoConf
  } = conf.getFactory('ETHEREUM_REPO')

  const getEthereumClient = require('../../helpers/ethereumClient')
  const ethereumClient = await getEthereumClient()
  const web3 = ethereumClient.getWeb3()

  const {
    CACHE
    /*
    DEFAULT_GAS,
    TRANSACTION_RETRY_TIME,
    GAS_RETRY_INCREMENT,
    OVER_FAST_PRICE_FACTOR,
    GAS_ESTIMATION_CORRECTION_FACTOR,
    DEFAULT_GAS_PRICE_USED
    */
  } = conf

  return new EthereumRepo({
    web3,
    ethereumClient,
    cacheConf: CACHE,

    // Override config
    ...ethereumRepoConf
  })
}
