// const Promise = require('../helpers/Promise')
const debug = require('debug')('dx-service:bots:SellLiquidityBot')

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
      debug(
        "An auction for the par %s-%s has ended. Let's ensure the liquidity",
        tokenA,
        tokenB
      )
      this._auctionService
        .ensureSellLiquidity({ tokenA, tokenB })
        .then(boughtTokens => {
          if (boughtTokens > 0) {
            debug(
              "I've bought %d tokens to ensure liquidity on the market %s-%s",
              boughtTokens,
              tokenA,
              tokenB
            )
          } else {
            debug('There was no need to sell any token to ensure liquidity on the market %s-%s',
              tokenA, tokenB
            )
          }
        })
        .catch(error => {
          // TODO: How do we handle this error?
          // It would be nice, at list a slack message or sth
          console.error(error)
        })
    })
  }

  async stop () {
    debug('Bot stopped')
  }
}

module.exports = SellLiquidityBot
