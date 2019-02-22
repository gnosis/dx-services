const conf = require('../../../conf')
const getWeb3 = require('../web3')
const EthereumClient = require('./EthereumClient')
let ethereumClient

async function getEthereumClient () {
  if (!ethereumClient) {
    const {
      NETWORK,
      CACHE,
      URL_GAS_PRICE_FEED_GAS_STATION,
      URL_GAS_PRICE_FEED_SAFE
    } = conf

    // Get instance of web3 by
    const web3 = await getWeb3()

    ethereumClient = new EthereumClient({
      web3,
      network: NETWORK,
      cacheConf: CACHE,
      urlPriceFeedGasStation: URL_GAS_PRICE_FEED_GAS_STATION,
      urlPriceFeedSafe: URL_GAS_PRICE_FEED_SAFE
    })

    await ethereumClient.start()
  }

  return ethereumClient
}

module.exports = async () => {
  if (!ethereumClient) {
    ethereumClient = await getEthereumClient()
  }

  return ethereumClient
}
