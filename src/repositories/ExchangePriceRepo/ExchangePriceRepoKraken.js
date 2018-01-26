const debug = require('debug')('dx-service:repositories:ExchangePriceRepoKraken')
const httpRequest = require('../../helpers/httpRequest')

// Default options
const defaults = {
	url: 'https://api.kraken.com',
	version: 0,
	timeout: 5000,
}

class ExchangePriceRepoKraken {
  constructor (options) {
    this._config = Object.assign(defaults, options)
  }

  async getPrice ({tokenA, tokenB}) {
    debug('Get price for %s-%s', tokenA, tokenB)

    const url = this._config.url + '/' +this._config.version + '/public/Ticker'
		const request = {url, method: 'POST', data: {pair: tokenA + tokenB}, timeout: this._config.timeout }
		const response = await httpRequest.rawRequest(request, {})
    debug('Kraken Response to ' + tokenA + tokenB + ': ', response.result[Object.keys(response.result)[0]].c[0])
    return response.result[Object.keys(response.result)[0]].c[0]
  }
}

module.exports = ExchangePriceRepoKraken
