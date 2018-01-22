// const Promise = require('../helpers/Promise')
const debug = require('debug')('dx-service:bots:sellLiquidityBot')

class SellLiquidityBot {
  constructor ({ auctionEventsBus, auctionService }) {
    this._auctionEventsBus = auctionEventsBus
    this._auctionService = auctionService
  }

  run () {
    debug('Initialized bot')
    // TODO: Listen for events and delegate into the service layer
    debug('TODO: Register to event')
  }
}

module.exports = SellLiquidityBot
