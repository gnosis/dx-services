const PriceRepoImpl = require('../../../src/repositories/PriceRepo/PriceRepoImpl')

const EXCHANGE_PRICE_FEED_STRATEGIES_DEFAULT = {
  strategy: 'sequence', // TODO: More strategies can be implemented. i.e. averages, median, ponderated volumes, ...
  feeds: ['binance', 'huobi', 'kraken', 'bitfinex']
}

const EXCHANGE_PRICE_FEED_STRATEGIES = {
  'ETH-OMG': {
    strategy: 'sequence',
    feeds: ['binance', 'huobi', 'bitfinex']
  },
  'ETH-RDN': {
    strategy: 'sequence',
    feeds: ['huobi', 'binance', 'bitfinex']
  }
}

const priceRepo = new PriceRepoImpl({
  priceFeedStrategiesDefault: EXCHANGE_PRICE_FEED_STRATEGIES_DEFAULT,
  priceFeedStrategies: EXCHANGE_PRICE_FEED_STRATEGIES
})

priceRepo.getPrice({
  tokenA: 'RDN',
  tokenB: 'ETH'
})
  .then(console.log)
  .catch(console.error)
