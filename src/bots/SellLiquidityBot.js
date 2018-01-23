// const Promise = require('../helpers/Promise')
const debug = require('debug')('dx-service:bots:sellLiquidityBot')

class SellLiquidityBot {
  constructor ({ eventBus, auctionService }) {
    this._eventBus = eventBus
    this._auctionService = auctionService
  }

  async run () {
    debug('Initialized bot')
    // TODO: Listen for events and delegate into the service layer
    this._eventBus.listenToEvents(
      ['AUCTION_START', 'AUCTION_END'],
      ({ eventName, data }) => {
        this.sayHi(eventName)
      }
    )
  }

  async stop () {
    debug('Bot stopped')
  }

  sayHi (eventName) {
    debug('Hi, it seams the market is now %s', eventName)
  }
}

module.exports = SellLiquidityBot
