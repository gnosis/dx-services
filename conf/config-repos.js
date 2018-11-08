module.exports = {
  // Gas price config
  DEFAULT_GAS_PRICE_USED: process.env.DEFAULT_GAS_PRICE_USED || 'fast',
  URL_GAS_PRICE_FEED_GAS_STATION: null,
  URL_GAS_PRICE_FEED_SAFE: null,

  // Transaction retry conf
  TRANSACTION_RETRY_TIME: process.env.TRANSACTION_RETRY_TIME || 5 * 60 * 1000, // 5 minutes (in miliseconds),
  GAS_RETRY_INCREMENT: process.env.GAS_RETRY_INCREMENT || 1.2, // (previous_gas * GAS_RETRY_INCREMENT) === increment 20%
  OVER_FAST_PRICE_FACTOR: process.env.OVER_FAST_PRICE_FACTOR || 1, // (fast_price * OVER_FAST_PRICE_FACTOR) === using maximum the fastest gas price
  GAS_ESTIMATION_CORRECTION_FACTOR: process.env.GAS_ESTIMATION_CORRECTION_FACTOR || 2, // Gas estimation correction for proxied contract

  // AuctionRepo conf
  AUCTION_REPO_IMPL: 'impl', // mock, impl

  // EthereumRepo conf
  ETHEREUM_REPO_IMPL: 'impl', // mock. impl

  // ExchangePriceRepo conf
  EXCHANGE_PRICE_REPO_IMPL: 'impl', // mock. impl
  EXCHANGE_PRICE_FEED_STRATEGIES_DEFAULT: {
    strategy: 'sequence', // TODO: More strategies can be implemented. i.e. averages, median, ponderated volumes, ...
    feeds: ['binance', 'huobi', 'kraken', 'bitfinex', 'hitbtc', 'liquid']
  },
  EXCHANGE_PRICE_FEED_STRATEGIES: {
    'WETH-OMG': {
      strategy: 'sequence',
      feeds: ['binance', 'huobi', 'bitfinex']
    },
    'WETH-RDN': {
      strategy: 'sequence',
      feeds: ['huobi', 'binance', 'bitfinex']
    }
  },

  // Kraken custom config
  KRAKEN: {
    url: 'https://api.kraken.com',
    version: '0'
  }
}
