apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ .configMapName }}
  labels:
    env: '{{ .environment }}'
    network: '{{ .ethereumNetwork }}'
data:
  bots.js: |
    // Bots config
    const HOSTED_MARKETS = [
      { tokenA: 'RDN', tokenB: 'WETH' },
      { tokenA: 'OMG', tokenB: 'WETH' },
      { tokenA: 'GNO', tokenB: 'WETH' }
    ]

    const EXTERNAL_MARKETS = [
      // { tokenA: 'WETH', tokenB: 'DAI' },
      // { tokenA: 'WETH', tokenB: 'GEN' }
    ]

    const MARKETS = HOSTED_MARKETS.concat(EXTERNAL_MARKETS)

    // const TOKENS = ['RDN', 'OMG', 'WETH', 'DAI', 'GEN']
    const TOKENS = ['RDN', 'OMG', 'WETH', 'GNO']


    const PRICE_REPO = {
      factory: 'src/repositories/PriceRepo/PriceRepoImpl',
      priceFeedStrategiesDefault: {
        strategy: 'sequence',
        feeds: ['binance', 'huobi', 'kraken', 'bitfinex', 'idex', 'hitbtc', 'liquid']
      },
      priceFeedStrategies: {
        'WETH-OMG': {
          strategy: 'sequence',
          feeds: ['binance', 'huobi', 'bitfinex']
        },
        'WETH-RDN': {
          strategy: 'sequence',
          feeds: ['huobi', 'binance', 'bitfinex']
        },
        'DAI-MKR': {
          strategy: 'sequence',
          feeds: ['hitbtc', 'bitfinex']
        },
        'WETH-DAI': {
          strategy: 'sequence',
          feeds: ['hitbtc', 'bitfinex']
        },
        'WETH-MKR': {
          strategy: 'sequence',
          feeds: ['hitbtc', 'bitfinex']
        },
        'WETH-GEN': {
          strategy: 'sequence',
          feeds: ['idex', 'liquid']
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
        idex: {
          factory: 'src/repositories/PriceRepo/feeds/PriceRepoIdex'
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

    const MAIN_BOT_ACCOUNT = 0
    const BACKUP_BOT_ACCOUNT = 1


    // Watch events and notify the event bus
    //   - Other bots, like the sell bot depends on it
    const WATCH_EVENTS_BOT = {
      name: '[Staging Rinkeby] Watch events bot',
      markets: MARKETS,
      factory: 'src/bots/WatchEventsBot'
    }

    // Arbitrage bot
    const ARB_BOT = {
      name: 'Arbitrage bot',
      factory: 'src/bots/ArbitrageBot',
      markets: MARKETS,
      accountIndex: MAIN_BOT_ACCOUNT,
      // rules: BUY_LIQUIDITY_RULES_DEFAULT,
      notifications: [{
        type: 'slack',
        channel: '' // If none provided uses SLACK_CHANNEL_BOT_TRANSACTIONS
      }],
      checkTimeInMilliseconds: 60 * 1000 // 60s
    }

    MNEMONIC = ''

    module.exports = {
      MNEMONIC,
      MARKETS,
      PRICE_REPO,
      MAIN_BOT_ACCOUNT,
      BOTS:[
        ARB_BOT,
        WATCH_EVENTS_BOT
      ]
    }
