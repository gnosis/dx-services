const debug = require('debug')('DEBUG-dx-service:repositories:ExchangePriceRepoHuobi')
const httpRequest = require('../../helpers/httpRequest')

class ExchangePriceRepoHuobi {
  constructor ({ url = 'https://api.huobi.pro', version = 'v1', timeout = 5000 }) {
    this._timeout = timeout
    this._version = version
    this._baseUrl = url
  }

  // Get Huobi market pairs
  async getSymbols () {
    debug('Get symbols')

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

    const SYMBOLS = await this.getSymbols()

    let pairOrder = SYMBOLS.filter(pair => {
      return (pair['base-currency'] === tokenA.toLowerCase() ||
        pair['quote-currency'] === tokenA.toLowerCase()) &&
        (pair['base-currency'] === tokenB.toLowerCase() ||
        pair['quote-currency'] === tokenB.toLowerCase())
    })

    if (pairOrder.length === 0) {
      throw Error('No matching markets in Huobi: ' + tokenA + '-' + tokenB)
    }

    debug('Pair order result: %s', pairOrder)
    return tokenA.toLowerCase() === pairOrder[0]['quote-currency'] &&
      tokenB.toLowerCase() === pairOrder[0]['base-currency']
  }
}

module.exports = ExchangePriceRepoHuobi
