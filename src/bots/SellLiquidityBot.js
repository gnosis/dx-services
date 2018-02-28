// const Promise = require('../helpers/Promise')
const debug = require('debug')('dx-service:bots:SellLiquidityBot')
const events = require('../helpers/events')

class SellLiquidityBot {
  constructor ({ eventBus, botService }) {
    this._eventBus = eventBus
    this._botService = botService
  }

  async run () {
    debug('Initialized bot')

    // Ensure the sell liquidity when an aunction has ended
    this._eventBus.listenTo(events.EVENT_AUCTION_CLRARED, ({ eventName, data }) => {
      const { sellToken, buyToken } = data
      debug(
        "An auction for the par %s-%s has ended. Let's ensure the liquidity",
        sellToken,
        buyToken
      )
      this._botService
        .ensureSellLiquidity({ sellToken, buyToken })
        .then(soldTokens => {
          if (soldTokens.amount > 0) {
            debug(
              "I've sold %d %s tokens to ensure liquidity on the market %s-%s",
              soldTokens.amount,
              soldTokens.token,
              sellToken,
              buyToken
            )
          } else {
            debug('There was no need to sell any token to ensure liquidity on the market %s-%s',
              sellToken, buyToken
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
