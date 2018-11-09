const formatUtil = require('../../helpers/formatUtil')
const assert = require('assert')

class PriceRepoImpl {
  constructor ({
    priceFeedStrategiesDefault,
    priceFeedStrategies,
    priceFeeds
  }) {
    assert(priceFeedStrategiesDefault, '"priceFeedStrategiesDefault" is required')
    assert(priceFeedStrategies, '"priceFeedStrategies" is required')
    assert(priceFeeds, '"priceFeeds" is required')    
    Object.keys(priceFeeds)
      .forEach(priceFeedName => {
        const priceFeed = priceFeeds[priceFeedName]
        assert(priceFeed.factory, `"factory" is required in the price feed "${priceFeedName}"`)
      })

    this._priceFeedStrategiesDefault = priceFeedStrategiesDefault
    this._priceFeedStrategies = _normalizeMarketName(priceFeedStrategies)
    this._priceFeeds = priceFeeds
    this._strategies = {}
  }

  async getPrice ({ tokenA, tokenB }) {
    const marketName = formatUtil.formatMarketDescriptor({ tokenA, tokenB })

    // Get best price strategy for the market
    let strategydata = this._priceFeedStrategies[marketName] || this._priceFeedStrategiesDefault
    const strategy = this._getStrategy(strategydata.strategy)

    // To check price of WETH we need to check ETH price
    let tokenPair = { tokenA, tokenB }
    if (tokenA === 'WETH') {
      tokenPair.tokenA = 'ETH'
    } else if (tokenB === 'WETH') {
      tokenPair.tokenB = 'ETH'
    }

    // Delegate to the strategy
    return strategy.getPrice(tokenPair, strategydata)
  }

  _getStrategy (strategyName) {
    let strategy = this._strategies[strategyName]
    if (!strategy) {
      strategy = require(this._priceFeeds[strategyName].factory)
      this._strategies[strategyName] = strategy
    }
    return strategy
  }
}

function _normalizeMarketName (priceFeedStrategies) {
  return Object.keys(priceFeedStrategies).reduce((normalized, key) => {
    let { sellToken: tokenA, buyToken: tokenB } = formatUtil.tokenPairSplit(key)
    let normalizedKey = formatUtil.formatMarketDescriptor({
      tokenA, tokenB })

    normalized[normalizedKey] = priceFeedStrategies[key]
    return normalized
  }, {})
}

module.exports = PriceRepoImpl
