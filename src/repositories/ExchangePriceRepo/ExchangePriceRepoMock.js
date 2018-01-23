const debug = require('debug')('dx-service:repositories:exchangePrice')

class ExchangePriceRepoMock {
  constructor () {
    // RDN/ETH: 0.004079
    //  So 1 ETH = 243.891605 RDN
    //  https://walletinvestor.com/converter/usd/ethereum/290
    this._currentPrice = 0.004079
    this._changePriceRandomly()
  }

  async getPrice ({ tokenA, tokenB }) {
    debug('Get price for the pair %s-%s')
    return this._currentPrice
  }

  _changePriceRandomly () {
    // Changes the price every 5 seconds in the range [-10%, +10%]
    setInterval(() => {
      const percentageDifference = Math.floor(10 * Math.random())
      const sign = Math.random() < 0.5 ? -1 : 1
      this._currentPrice = this._currentPrice +
        sign * (percentageDifference * this._currentPrice / 100)
      debug(
        'New price (%s%s%): %d',
        (sign === -1 ? '-' : '+'),
        percentageDifference,
        this._currentPrice)
    }, 5000)
  }
}

module.exports = ExchangePriceRepoMock
