const debug = require('debug')('DEBUG-dx-service:repositories:PriceRepoKraken')
debug.log = console.debug.bind(console)

const httpRequest = require('../../../helpers/httpRequest')
const LAST_OPERATION_PROP_NAME = 'c'

class PriceRepoKraken {
  constructor ({ url = 'https://api.kraken.com', version = 0, timeout = 5000 }) {
    this._timeout = timeout
    this._baseUrl = url + '/' + version
  }

  async getPrice ({ tokenA, tokenB }) {
    debug('Get price for %s-%s', tokenA, tokenB)
    const url = this._baseUrl + '/public/Ticker'
    debug('url: %s', url)
    return this
      ._doPost(url, {
        pair: tokenA + tokenB
      })
      .then(krakenResponse => {
        const firstPair = getFirstPair(krakenResponse.result)
        const operation = getOperation(firstPair)

        return operation.price
      })

    /*
    debug('Kraken Response to ' + tokenA + tokenB + ': ', response.result[Object.keys(response.result)[0]].c[0])
    return response.result[Object.keys(response.result)[0]].c[0]
    */
  }

  async _doPost (url, data) {
    const request = {
      url,
      method: 'POST',
      data,
      timeout: this._timeout
    }
    debug('request: %o', request)

    return httpRequest
      .rawRequest(request, {})
  }
}

function getFirstPair (krakenResult) {
  const firstProp = Object.keys(krakenResult)[0]
  return krakenResult[firstProp]
}

function getOperation (pair) {
  const [ price, amount ] = pair[LAST_OPERATION_PROP_NAME]
  return { price, amount }
}

module.exports = PriceRepoKraken
