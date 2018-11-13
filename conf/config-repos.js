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
  AUCTION_REPO: {
    factory: 'src/repositories/AuctionRepo/AuctionRepoImpl' // mock, impl
  },

  // EthereumRepo conf
  ETHEREUM_REPO: {
    factory: 'src/repositories/EthereumRepo/EthereumRepoImpl' // mock, impl
  },

  // PriceRepo conf
  PRICE_REPO: {
    factory: 'src/repositories/PriceRepo/PriceRepoImpl', // mock, impl
    priceFeedStrategiesDefault: {
      strategy: 'sequence', // TODO: More strategies can be implemented. i.e. averages, median, ponderated volumes, ...
      feeds: ['binance', 'huobi', 'kraken', 'bitfinex', 'hitbtc', 'liquid']
    },
    priceFeedStrategies: {
      'WETH-OMG': {
        strategy: 'sequence',
        feeds: ['binance', 'huobi', 'bitfinex']
      },
      'WETH-RDN': {
        strategy: 'sequence',
        feeds: ['huobi', 'binance', 'bitfinex']
      }
    },
    priceFeeds: {
      binance: {
        factory: 'src/repositories/PriceRepo/feeds/PriceRepoBinance'
      },
      huobi: {
        factory: 'src/repositories/PriceRepo/feeds/PriceRepoHuobi'
      },
      kraken: {
        factory: 'src/repositories/PriceRepo/feeds/PriceRepoKraken',
        url: 'https://api.kraken.com',
        version: '0'
      },
      bitfinex: {
        factory: 'src/repositories/PriceRepo/feeds/PriceRepoBitfinex'
      },
      hitbtc: {
        factory: 'src/repositories/PriceRepo/feeds/PriceRepoHitbtc'
      },
      liquid: {
        factory: 'src/repositories/PriceRepo/feeds/PriceRepoLiquid'
      }
    },
    strategies: {
      sequence: {
        factory: 'src/repositories/PriceRepo/strategies/sequence'
      }
    }
  }
}
