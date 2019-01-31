const EthereumClient = require('./EthereumClient')
const Logger = require('../helpers/Logger')

const loggerNamespace = 'dx-service:repositories:EthereumSafeClient'
const logger = new Logger(loggerNamespace)


class EthereumSafeClient extends EthereumClient {
  constructor ({
    conf,
    web3,
    network,
    cacheConf,
    urlPriceFeedGasStation,
    urlPriceFeedSafe
  }) {
    super({
      web3,
      cacheConf,
      cacheName: 'EthereumSafeClient',
      network,
      urlPriceFeedGasStation,
      urlPriceFeedSafe
    })

    logger.debug('Instantiating EthereumSafeClient')
    this._conf = conf
  }

  /**
   * Overrides parent getAccounts and force return the current SAFE address as the only account available
   */
  async getAccounts () {
    return [ this._conf.SAFE_MODULE_ADDRESSES.SAFE_ADDRESS ]
  }

 
}

module.exports = EthereumSafeClient
