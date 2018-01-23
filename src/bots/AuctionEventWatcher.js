const debug = require('debug')('dx-service:bots:AuctionEventWatcher')
const Promise = require('../helpers/Promise')

/*
TODO: Events: first draft.
* `AUCTION_START`:
  * `startTime`
  * `auctionId` (in the smart contract is call index)
  * `tokenA`: String,
  * `tokenB`: String
* `AUCTION_END`:
  * `auctionId`
  * `tokenA`: String,
  * `tokenB`: String
* `MARKET_PRICE_CHANGE`:
  * `auctionId`
  * `tokenA`: String,
  * `tokenB`: String
* `BUY_VULUME_CHANGE`: Object
  * `buyVolume`: Double
  * `auctionId`
  * `tokenA`: String,
  * `tokenB`: String
*/

class AuctionEventWatcher {
  constructor ({ eventBus, auctionService, markets }) {
    this._eventBus = eventBus
    this._auctionService = auctionService
    this._markets = markets
  }

  startWatching () {
    debug('Starting the the following auctions markets %o...', this._markets)
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // TODO: Delegate service, try to detect certain
        // events and notify the eventBus
        debug('Auction markets are now being watched')
        this.fakeMockTest()
      }, 1000)

      setTimeout(() => {
        debug('The AuctionEventWatcher decided to stop watching')
        resolve()
      }, 10000)
    })
  }

  stopWatching () {
    debug('Stopping the auction watch...')
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // TODO: Delegate service
        debug('Auction markets are not longer being watch')
        resolve()
      }, 2000)
    })
  }

  fakeMockTest () {
    setTimeout(() => {
      this._eventBus.trigger('AUCTION_START', {
        startTime: new Date(),
        auctionId: 12345,
        tokenA: 'RDN',
        tokenB: 'ETH'
      })
    }, 2000)

    setTimeout(() => {
      this._eventBus.trigger('AUCTION_END', {
        auctionId: 12345,
        tokenA: 'RDN',
        tokenB: 'ETH'
      })
    }, 4000)
  }
}

module.exports = AuctionEventWatcher
