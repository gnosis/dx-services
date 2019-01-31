const conf = require('../conf')
const getWeb3 = require('./getWeb3')
let ethereumClient

async function getEthereumClient () {
  if (!ethereumClient) {
    const {
      NETWORK,
      CACHE,
      URL_GAS_PRICE_FEED_GAS_STATION,
      URL_GAS_PRICE_FEED_SAFE,
      getDXMode
    } = conf

    // Get instance of web3 by 
    const web3 = getWeb3({ conf })
    const EthereumClient = require('./helpers/EthereumClient')
    const EthereumSafeClient = require('./helpers/EthereumSafeClient')

    if (getDXMode() == 'safe') {
      ethereumClient = new EthereumSafeClient({
        conf,
        web3,
        network: NETWORK,
        cacheConf: CACHE,
        urlPriceFeedGasStation: URL_GAS_PRICE_FEED_GAS_STATION,
        urlPriceFeedSafe: URL_GAS_PRICE_FEED_SAFE
      })
    } else {
      ethereumClient = new EthereumClient({
        web3,
        network: NETWORK,
        cacheConf: CACHE,
        urlPriceFeedGasStation: URL_GAS_PRICE_FEED_GAS_STATION,
        urlPriceFeedSafe: URL_GAS_PRICE_FEED_SAFE
      })
    }

    await ethereumClient.start()
  }

  return ethereumClient
}

module.exports = getEthereumClient
