const loggerNamespace = 'dx-service:repositories:AuctionRepoImpl'
const Logger = require('../../helpers/Logger')
const logger = new Logger(loggerNamespace)

const Cacheable = require('../../helpers/Cacheable')

const assert = require('assert')

class DxPriceOracleRepoImpl extends Cacheable {
  constructor ({
    ethereumClient,
    contracts,
    // Cache
    cacheConf
  }) {
    super({
      cacheConf,
      cacheName: 'DxOraclePriceRepo'
    })
    assert(ethereumClient, '"ethereumClient" is required')
    assert(contracts, '"contracts" is required')

    this._ethereumClient = ethereumClient
    this._BLOCKS_MINED_IN_24H = ethereumClient.toBlocksFromSecondsEst(24 * 60 * 60)

    // Contracts
    this._dx = contracts.dx
    this._dxPriceOracle = contracts.dxPriceOracle
    this._priceOracle = contracts.priceOracle
    this._tokens = Object.assign({
      GNO: contracts.gno,
      WETH: contracts.eth,
      MGN: contracts.mgn,
      OWL: contracts.owl
    }, contracts.erc20TokenContracts)

    logger.debug({
      msg: `DX Price oracle in address %s`,
      params: [this._dxPriceOracle.address]
    })

    this.ready = Promise.resolve()
    Object.keys(this._tokens).forEach(token => {
      const contract = this._tokens[token]
      logger.debug({
        msg: `Token %s in address %s`,
        params: [token, contract.address]
      })
    })
  }

  async getPrice ({ token }) {
    assert(token, '"token" containing a token address is required')

    return this
      ._callForToken({
        operation: 'getPrice',
        token,
        cacheTime: this._cacheTimeAverage
      }).then(toFraction)
  }

  async getPriceCustom ({ token, time = 0, maximumTimePeriod = 388800, requireWhitelisted = true, numberOfAuctions = 9 }) {
    assert(token, '"token" containing a token address is required')

    return this
      ._callForToken({
        operation: 'getPriceCustom',
        token,
        args: [ time, requireWhitelisted, maximumTimePeriod, numberOfAuctions ],
        cacheTime: this._cacheTimeAverage
      }).then(toFraction)
  }

  async getPricesAndMedian ({ token, numberOfAuctions = 9, auctionIndex }) {
    assert(token, '"token" containing a token address is required')
    assert(numberOfAuctions, '"numberOfAuctions" is required')
    assert(auctionIndex, '"auctionIndex" is required')

    return this
      ._callForToken({
        operation: 'getPricesAndMedian',
        token,
        args: [ numberOfAuctions, auctionIndex ],
        cacheTime: this._cacheTimeAverage
      }).then(toFraction)
  }

  async _callForToken ({
    operation,
    token,
    args = [],
    checkToken = true,
    cacheTime
  }) {
    // const tokenAddress = await this._getTokenAddress(token, checkToken)
    const params = [token, ...args]

    // return this._dxPriceOracle[operation].call(...params)
    return this._doCall({ operation, params, cacheTime })
  }

  async _doCall ({
    operation,
    params,
    cacheTime = this._cacheTimeShort
  }) {
    // NOTE: cacheTime can be set null/0 on porpouse, so it's handled from the
    //  caller method

    logger.trace('Call: ' + operation, params)
    if (this._cache && cacheTime !== null) {
      const cacheKey = this._getCacheKey({ operation, params })
      return this._cache.get({
        key: cacheKey,
        time: cacheTime, // Caching time in seconds
        fetchFn: () => {
          return this._fetchFromBlockchain({ operation, params })
        }
      })
    } else {
      return this._fetchFromBlockchain({ operation, params })
    }
  }

  _fetchFromBlockchain ({ operation, params }) {
    logger.trace('Fetching from blockchain: ' + operation, params)
    // Check if operation is in dx or dxHelper
    return this._dxPriceOracle[operation]
      .call(...params)
      .catch(e => {
        logger.error({
          msg: 'ERROR: Call %s with params: [%s]',
          params: [operation, params.join(', ')],
          e
        })
        throw e
      })
  }

  _getCacheKey ({ operation, params }) {
    return operation + ':' + params.join('-')
  }
}

function toFraction ([numerator, denominator]) {
  // the contract return 0/0 when something is undetermined
  if (numerator.isZero() && denominator.isZero()) {
    return null
  } else {
    return { numerator, denominator }
  }
}

module.exports = DxPriceOracleRepoImpl
