const got = require('got')
const qs = require('qs')

// Send an API request
const rawRequest = async (request, headers) => {
  // Set custom User-Agent string
  headers['User-Agent'] = 'Custom Javascript API Client'

	const options = { headers }

	Object.assign(options, {
		body: qs.stringify(request.data),
	}, request)
	const { body } = await got(request.url, options);
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

module.exports = {
  rawRequest
}
