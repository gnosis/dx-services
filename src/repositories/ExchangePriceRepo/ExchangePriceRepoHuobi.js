const debug = require('debug')('dx-service:repositories:ExchangePriceRepoHuobi')
const httpRequest = require('../../helpers/httpRequest')


// Default options
const defaults = {
	url: 'https://api.huobi.pro',
	version: 'v1',
	timeout: 5000,
}

class ExchangePriceRepoHuobi {
  constructor (options) {
    this._config = Object.assign(defaults, options)
  }

  async getPrice ({tokenA, tokenB}) {
    debug('Get price for %s-%s', tokenA, tokenB)

    const url = this._config.url + '/market/detail/merged?symbol=' + tokenA.toLowerCase() + tokenB.toLowerCase()
    debug('Huobi request url: ', url)

		const request = {url, method: 'GET', data: {}, timeout: this._config.timeout }
    const response = await httpRequest.rawRequest(request, {})
    debug('Huobi Response to ' + tokenA + tokenB + ': ', response.tick.close.toString())
    return response.tick.close.toString()
  }
}

module.exports = ExchangePriceRepoHuobi
