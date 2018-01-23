// const Promise = require('../helpers/Promise')
const debug = require('debug')('dx-service:bots:sellLiquidityBot')

class SellLiquidityBot {
  constructor ({ eventBus, auctionService }) {
    this._eventBus = eventBus
    this._auctionService = auctionService
  }

  async run () {
    debug('Initialized bot')

    // Ensure the sell liquidity when an aunction has ended
    this._eventBus.listenTo('AUCTION_END', ({ eventName, data }) => {
      const { tokenA, tokenB } = data
      this._auctionService.ensureSellLiquidity({ tokenA, tokenB })
    })
  }

  async stop () {
    debug('Bot stopped')
  }
}

module.exports = SellLiquidityBot
