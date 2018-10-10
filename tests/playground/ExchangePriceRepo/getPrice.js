const PriceRepoImpl = require('../../../src/repositories/PriceRepo/PriceRepoImpl')
const formatUtil = require('../../../src/helpers/formatUtil.js')
const numberUtil = require('../../../src/helpers/numberUtil.js')

const EXCHANGE_PRICE_FEED_STRATEGIES_DEFAULT = {
  strategy: 'sequence', // TODO: More strategies can be implemented. i.e. averages, median, ponderated volumes, ...
  feeds: ['binance', 'huobi', 'kraken', 'bitfinex']
}

const EXCHANGE_PRICE_FEED_STRATEGIES = {
  'WETH-OMG': {
    strategy: 'sequence',
    feeds: ['binance', 'huobi', 'bitfinex']
  },
  'WETH-RDN': {
    strategy: 'sequence',
    feeds: ['huobi', 'binance', 'bitfinex']
  },
  'WETH-GEN': {
    strategy: 'sequence',
    feeds: ['liquid']
  }
}

const config = {
  EXCHANGE_PRICE_FEED_STRATEGIES_DEFAULT,
  EXCHANGE_PRICE_FEED_STRATEGIES
}

const priceRepo = new PriceRepoImpl({
  config
})

priceRepo.getPrice({
  tokenA: 'OMG',
  tokenB: 'WETH'
})
  .then(response => {
    // plain response
    console.log(response)
    let price = {
      numerator: numberUtil.toBigNumber(response.toString()),
      denominator: numberUtil.ONE
    }
    let fraction = formatUtil.formatFraction(price)
    // After converting number to BigNumber and handling for printing
    console.log(fraction)
  })
  .catch(console.error)
