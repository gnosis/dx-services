const debug = require('debug')('dx-service:repositories:ExchangePriceRepoKraken')
const got = require('got')
const qs = require('qs')

// Default options
const defaults = {
	url: 'https://api.kraken.com',
	version: 0,
	timeout: 5000,
};

// Send an API request
const rawRequest = async (url, headers, data, timeout) => {
	// Set custom User-Agent string
	headers['User-Agent'] = 'Kraken Javascript API Client'

	const options = { headers, timeout }

	Object.assign(options, {
		method: 'POST',
		body: qs.stringify(data),
	});
	const { body } = await got(url, options);
	const response = JSON.parse(body)

	if(response.error && response.error.length) {
		const error = response.error
			.filter((e) => e.startsWith('E'))
			.map((e) => e.substr(1))

		if(!error.length) {
			throw new Error("Kraken API returned an unknown error")
		}

		throw new Error(error.join(', '))
	}

	return response
}

class ExchangePriceRepoKraken {
  constructor (options) {
    this._config = Object.assign(defaults, options)
  }

  async getPrice ({tokenA, tokenB}) {
    debug('Get price for %s-%s', tokenA, tokenB)

    const url = this._config.url + '/' +this._config.version + '/public/Ticker'
    const response = await rawRequest(url, {}, {pair: tokenA + tokenB}, this._config.timeout)
    debug('Kraken Response to ' + tokenA + tokenB + ': ', response.result[Object.keys(response.result)[0]].c[0])
    return response.result[Object.keys(response.result)[0]].c[0]
  }
}

module.exports = ExchangePriceRepoKraken
