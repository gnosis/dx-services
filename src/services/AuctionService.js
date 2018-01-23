const debug = require('debug')('dx-service:services:auction')

class AuctionService {
  constructor (auctionRepo, exchangePriceRepo, minimumSellVolume) {
    this._auctionRepo = auctionRepo
    this._exchangePriceRepo = exchangePriceRepo

    // Config
    this._minimumSellVolume = minimumSellVolume
  }

  ensureSellLiquidity (tokenA, tokenB) {
    debug('Ensure Sell liquidity on %s-%s market is over %d',
      tokenA,
      tokenB,
      this._minimumSellVolume
    )
    // TODO: Implement using repos
    throw new Error('Not implemented yet')
  }
}

module.exports = AuctionService
