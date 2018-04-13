const formatUtil = require('../../helpers/formatUtil')

class PriceRepoImpl {
  constructor ({ priceFeedStrategiesDefault, priceFeedStrategies }) {
    this._priceFeedStrategiesDefault = priceFeedStrategiesDefault
    this._priceFeedStrategies = _normalizeMarketName(priceFeedStrategies) // TODO: implement
    this._strategies = {}
  }

  async getPrice ({ tokenA, tokenB }) {
    const marketName = formatUtil.formatMarketDescriptor({ tokenA, tokenB })

    // Get best price strategy for the market
    let strategydata = this._priceFeedStrategies[marketName] || this._priceFeedStrategiesDefault
    const strategy = this._getStrategy(strategydata.strategy)

    // Delegate to the strategy
    return strategy.getPrice({ tokenA, tokenB }, strategydata)
  }

  _getStrategy (strategyName) {
    let strategy = this._strategies[strategyName]
    if (!strategy) {
      strategy = require('../strategies/' + strategyName)
      this._strategies[strategyName] = strategy
    }
    return strategy
  }
}

function _normalizeMarketName (priceFeedStrategies) {
  // TODO: return a new object with the normalized keys
  return priceFeedStrategies
}

module.exports = PriceRepoImpl
