const debug = require('debug')('DEBUG-dx-service:repositories:PriceRepoHuobi')
const httpRequest = require('../../../helpers/httpRequest')
const Cache = require('../../../helpers/Cache')
const CACHE_SYMBOLS_KEY = 'PriceRepoHuobi:'
const CACHE_SYMBOLS_TIME = 2 * 60 * 60 * 1000 // 2 hours

class PriceRepoHuobi {
  constructor ({ url = 'https://api.huobi.pro', version = 'v1', timeout = 5000 }) {
    this._timeout = timeout
    this._version = version
    this._baseUrl = url
    this._cache = new Cache('PriceRepoHuobi')
  }

  // Get Huobi market pairs
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
    const url = this._baseUrl + '/' + this._version + '/common/symbols'
    debug('Huobi request symbols url: ', url)

    const request = { url, method: 'GET', data: {}, timeout: this._timeout }
    const response = await httpRequest.rawRequest(request, {})

    return response.data
  }

  async getPrice ({ tokenA, tokenB }) {
    debug('Get price for %s-%s', tokenA, tokenB)

    let invertTokens = await this._isTokenOrderInverted({ tokenA, tokenB })
    let tokenSymbol
    invertTokens ? tokenSymbol = tokenB + tokenA
      : tokenSymbol = tokenA + tokenB
    tokenSymbol = tokenSymbol.toLowerCase()

    const url = this._baseUrl + '/market/detail/merged?symbol=' + tokenSymbol
    debug('Huobi request price url: ', url)
    const request = { url, method: 'GET', data: {}, timeout: this._timeout }

    const response = await httpRequest.rawRequest(request, {})
    let closePrice = response.tick.close
    if (invertTokens) {
      closePrice = (1 / closePrice)
    }

    debug('Huobi Response to ' + tokenSymbol + ': ', closePrice.toString())
    return closePrice.toString()
  }

  // Check token order to get pair info from Huobi
  async _isTokenOrderInverted ({ tokenA, tokenB }) {
    debug('Check token order for %s-%s', tokenA, tokenB)
    const tokenALower = tokenA.toLowerCase()
    const tokenBLower = tokenB.toLowerCase()

    const symbols = await this.getSymbols()

    let matchingPairs = symbols.filter(pair => {
      const baseCurrency = pair['base-currency']
      const quoteCurrency = pair['quote-currency']
      return (
        baseCurrency === tokenALower ||
        quoteCurrency === tokenALower
      ) && (
        baseCurrency === tokenBLower ||
        quoteCurrency === tokenBLower)
    })

    if (matchingPairs.length === 0) {
      throw Error('No matching markets in Huobi: ' + tokenA + '-' + tokenB)
    }

    debug('Pair order result: %s', matchingPairs)
    const [ pair ] = matchingPairs
    return tokenALower === pair['quote-currency'] &&
    tokenBLower === pair['base-currency']
  }
}

module.exports = PriceRepoHuobi
