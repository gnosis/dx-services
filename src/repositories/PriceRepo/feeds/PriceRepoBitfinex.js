const debug = require('debug')('DEBUG-dx-service:repositories:PriceRepoBitfinex')
const httpRequest = require('../../../helpers/httpRequest')
const Cache = require('../../../helpers/Cache')
const CACHE_SYMBOLS_KEY = 'PriceRepoBitfinex:'
const CACHE_SYMBOLS_TIME = 2 * 60 * 60 * 1000 // 2 hours

class PriceRepoBitfinex {
  constructor ({ url = 'https://api.bitfinex.com', version = 'v1', timeout = 5000 }) {
    this._timeout = timeout
    this._version = version
    this._baseUrl = url
    this._cache = new Cache('PriceRepoBitfinex')
  }

  // Get Bitfinex market pairs
  async getSymbols () {
    debug('Get symbols')
    return this._cache.get({
      key: CACHE_SYMBOLS_KEY,
      time: CACHE_SYMBOLS_TIME,
      fetchFn: () => {
        return this._getSymbols()
      }
    })
  }

  async _getSymbols () {
    const url = this._baseUrl + '/' + this._version + '/symbols'
    debug('Bitfinex request symbols url: ', url)

    const request = { url, method: 'GET', data: {}, timeout: this._timeout }
    const response = await httpRequest.rawRequest(request, {})

    return response
  }

  async getPrice ({ tokenA, tokenB }) {
    debug('Get price for %s-%s', tokenA, tokenB)

    let invertTokens = await this._isTokenOrderInverted({ tokenA, tokenB })
    let tokenSymbol
    invertTokens ? tokenSymbol = tokenB + tokenA
      : tokenSymbol = tokenA + tokenB
    tokenSymbol = tokenSymbol.toLowerCase()

    const url = this._baseUrl + '/' + this._version + '/pubticker/' + tokenSymbol
    debug('Bitfinex request price url: ', url)
    const request = { url, method: 'GET', data: {}, timeout: this._timeout }

    const response = await httpRequest.rawRequest(request, {})
    let closePrice = response.last_price
    if (invertTokens) {
      closePrice = (1 / closePrice)
    }

    debug('Bitfinex Response to ' + tokenSymbol + ': ', closePrice.toString())
    return closePrice.toString()
  }

  // Check token order to get pair info from Bitfinex
  async _isTokenOrderInverted ({ tokenA, tokenB }) {
    debug('Check token order for %s-%s', tokenA, tokenB)
    const sameOrderPair = (tokenA + tokenB).toLowerCase()
    const invertedOrderPair = (tokenB + tokenA).toLowerCase()

    const symbols = await this.getSymbols()

    let matchingPairs = symbols.filter(pair => {
      return (pair === sameOrderPair || pair === invertedOrderPair)
    })

    if (matchingPairs.length === 0) {
      throw Error('No matching markets in Bitfinex: ' + tokenA + '-' + tokenB)
    }

    debug('Pair order result: %s', matchingPairs)
    const [ pair ] = matchingPairs
    return invertedOrderPair === pair
  }
}

module.exports = PriceRepoBitfinex
