const debug = require('debug')('dx-service:repositories:ExchangePriceRepoHuobi')
const got = require('got')
const qs = require('qs')

// Default options
const defaults = {
	url: 'https://api.huobi.pro',
	version: 'v1',
	timeout: 5000,
}

// Send an API request
const rawRequest = async (url, headers, data, timeout) => {
	// Set custom User-Agent string
	headers['User-Agent'] = 'Huobi Javascript API Client'

	const options = { headers, timeout }

	Object.assign(options, {
		method: 'GET',
		body: qs.stringify(data),
	})
  debug('Huobi request options: ', options)
	const { body } = await got(url, options);
	const response = JSON.parse(body)
  debug('Huobi response: ', response)

	if(response.status === 'error') {
		// const error = response.error
		// 	.filter((e) => e.startsWith('E'))
		// 	.map((e) => e.substr(1))

		if(!response['err-msg']) {
			throw new Error("Huobi API returned an unknown error")
		}

		throw new Error(response['err-msg'].join(', '))
	}

	return response
}

class ExchangePriceRepoHuobi {
  constructor (options) {
    this._config = Object.assign(defaults, options)
  }

  async getPrice ({tokenA, tokenB}) {
    debug('Get price for %s-%s', tokenA, tokenB)

    const url = this._config.url + '/market/detail/merged?symbol=' + tokenA.toLowerCase() + tokenB.toLowerCase()
    debug('Huobi request url: ', url)

    const response = await rawRequest(url, {}, {symbol: tokenA + tokenB}, this._config.timeout)
    debug('Huobi Response to ' + tokenA + tokenB + ': ', response.tick.close.toString())
    return response.tick.close.toString()
  }
}

module.exports = ExchangePriceRepoHuobi
