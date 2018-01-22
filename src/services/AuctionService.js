const debug = require('debug')('dx-service:services:auction')

class AuctionService {
  constructor (auctionRepo, exchangePriceRepo) {
    this._auctionRepo = auctionRepo
    this._exchangePriceRepo = exchangePriceRepo
  }

  ensureSellLiquidity (tokenA, tokenB) {
    debug('Ensure Sell liquidity on %s-%s market', tokenA, tokenB)
    // TODO: Implement using repos
    throw new Error('Not implemented yet')
  }
}

module.exports = AuctionService
