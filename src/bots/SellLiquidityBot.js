// const Promise = require('../helpers/Promise')
const debug = require('debug')('dx-service:bots:SellLiquidityBot')

class SellLiquidityBot {
  constructor ({ eventBus, botService }) {
    this._eventBus = eventBus
    this._botService = botService
  }

  async run () {
    debug('Initialized bot')

    // Ensure the sell liquidity when an aunction has ended
    // TODO: Make sure if it's the first or second market to end
    this._eventBus.listenTo('AUCTION_END', ({ eventName, data }) => {
      const { tokenA, tokenB } = data
      debug(
        "An auction for the par %s-%s has ended. Let's ensure the liquidity",
        tokenA,
        tokenB
      )
      this._botService
        .ensureSellLiquidity({ tokenA, tokenB })
        .then(soldTokens => {
          if (soldTokens.amount > 0) {
            debug(
              "I've sold %d %s tokens to ensure liquidity on the market %s-%s",
              soldTokens.amount,
              soldTokens.token,
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
