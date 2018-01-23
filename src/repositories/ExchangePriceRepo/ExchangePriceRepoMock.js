const debug = require('debug')('dx-service:repositories:exchangePrice')
class ExchangePriceRepoMock {
  constructor () {
    this._currentPrice = 12345.678

    setTimeout(() => {
      const difference = randomBetween(-1000, 1000) / 1000
      this._currentPrice = this._currentPrice + difference
      debug('New price: %d', this._currentPrice)
    }, 2000)
  }

  async getPrice () {
    return this._currentPrice
  }
}

function randomBetween (min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min)
}

module.exports = ExchangePriceRepoMock
