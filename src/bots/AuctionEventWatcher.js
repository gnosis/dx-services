const debug = require('debug')('dx-service:bots:sellLiquidityBot')
const Promise = require('../helpers/Promise')

class AuctionEventWatcher {
  constructor ({ auctionEventsBus, auctionService }) {
    this._auctionEventsBus = auctionEventsBus
    this._auctionService = auctionService
  }

  startWatching () {
    debug('Starting the auction watch...') // TODO: Conf markets
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // TODO: Delegate service
        debug('Auction markets are now being watched')
      }, 10000)
    })
  }

  stopWatching () {
    debug('Stopping the auction watch...')
    return new Promise((resolve, reject) => {
      // TODO: Delegate service
      debug('Auction markets not longer are being watch')
    })
  }
}

module.exports = AuctionEventWatcher
