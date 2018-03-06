const debug = require('debug')('DEBUG-dx-service:repositories:ExchangePriceRepoHuobi')
const httpRequest = require('../../helpers/httpRequest')

class ExchangePriceRepoHuobi {
  constructor ({ url = 'https://api.huobi.pro', version = 'v1', timeout = 5000 }) {
    this._timeout = timeout
    this._baseUrl = url
  }

  async getPrice ({tokenA, tokenB}) {
    debug('Get price for %s-%s', tokenA, tokenB)

    const url = this._baseUrl + '/market/detail/merged?symbol=' + tokenA.toLowerCase() + tokenB.toLowerCase()
    debug('Huobi request url: ', url)

    const request = { url, method: 'GET', data: {}, timeout: this._timeout }
    const response = await httpRequest.rawRequest(request, {})
    debug('Huobi Response to ' + tokenA + tokenB + ': ', response.tick.close.toString())
    return response.tick.close.toString()
  }
}

module.exports = ExchangePriceRepoHuobi
