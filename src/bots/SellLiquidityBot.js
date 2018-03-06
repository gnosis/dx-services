const loggerNamespace = 'dx-service:bots:SellLiquidityBot'
const AuctionLogger = require('../helpers/AuctionLogger')
const Logger = require('../helpers/Logger')

const logger = new Logger(loggerNamespace)
const auctionLogger = new AuctionLogger(loggerNamespace)
const events = require('../helpers/events')
const ENSURE_LIQUIDITY_PERIODIC_CHECK_MILLISECONDS = 4 * 1000

class SellLiquidityBot {
  constructor ({ eventBus, botService, botAddress, markets }) {
    this._eventBus = eventBus
    this._botService = botService
    this._botAddress = botAddress
    this._markets = markets
  }

  async start () {
    logger.debug('Initialized bot')

    // Ensure the sell liquidity when an aunction has ended
    this._eventBus.listenTo(events.EVENT_AUCTION_CLRARED, ({ eventName, data }) => {
      const { sellToken, buyToken } = data

      // Do ensure liquidity on the market
      auctionLogger.info(sellToken, buyToken, "Auction ended. Let's ensure liquidity")
      this._ensureSellLiquidity({
        sellToken,
        buyToken,
        from: this._botAddress
      })
    })

    // Backup strategy, in case events fail to notify the bot
    // From time to time, we ensure the liquidity
    setInterval(() => {
      this._markets.forEach(market => {
        const sellToken = market.tokenA
        const buyToken = market.tokenB
        // Do ensure liquidity on the market
        auctionLogger.debug(sellToken, buyToken, "Doing a routine check. Let's see if we need to ensure the liquidity")
        this._ensureSellLiquidity({
          sellToken,
          buyToken,
          from: this._botAddress,
          isRoutineCheck: true
        })
      })
    }, ENSURE_LIQUIDITY_PERIODIC_CHECK_MILLISECONDS)
  }

  async stop () {
    logger.debug('Bot stopped')
  }

  async _ensureSellLiquidity ({ sellToken, buyToken, from, isRoutineCheck = false }) {
    return this
      ._botService
      .ensureSellLiquidity({ sellToken, buyToken, from })
      .then(soldTokens => {
        if (soldTokens) {
          auctionLogger.info(sellToken, buyToken, "I've sold %d %s tokens to ensure liquidity",
            soldTokens.amount,
            soldTokens.sellToken
          )

          if (isRoutineCheck) {
            auctionLogger.warn(sellToken, buyToken, "The liquidity was enssured by the routine check. Make sure there's no problem getting events")
          }
        } else {
          auctionLogger.debug(sellToken, buyToken, 'There was no need to sell any token to ensure liquidity',
            sellToken, buyToken
          )
        }

        return soldTokens
      })
      .catch(error => {
        // TODO: How do we handle this error?
        // It would be nice, at list a slack message or sth
        auctionLogger.error(sellToken, buyToken,
          'There was an error ensuring liquidity: ' + error.toString())
        console.error(error)
      })
  }
}

module.exports = SellLiquidityBot
