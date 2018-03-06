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
      this._onAuctionCleared(eventName, data)
    })

    // Backup strategy: From time to time, we ensure the liquidity
    // Used only in case events fail to notify the bot
    setInterval(() => {
      this._markets.forEach(market => {
        const sellToken = market.tokenA
        const buyToken = market.tokenB
        this._doRoutineLiquidityCheck(sellToken, buyToken)
      })
    }, ENSURE_LIQUIDITY_PERIODIC_CHECK_MILLISECONDS)
  }

  async stop () {
    logger.debug('Bot stopped')
  }

  _onAuctionCleared (eventName, data) {
    const { sellToken, buyToken } = data

    // Do ensure liquidity on the market
    auctionLogger.info(sellToken, buyToken, "Auction ended. Let's ensure liquidity")
    this._ensureSellLiquidity({
      sellToken,
      buyToken,
      from: this._botAddress
    })
  }

  _doRoutineLiquidityCheck (sellToken, buyToken) {
    try {
      // Do ensure liquidity on the market
      auctionLogger.debug(sellToken, buyToken, "Doing a routine check. Let's see if we need to ensure the liquidity")
      this._ensureSellLiquidity({
        sellToken,
        buyToken,
        from: this._botAddress,
        isRoutineCheck: true
      })
      
    } catch (error) {
      _handleError(sellToken, buyToken, error)
    }
  }

  async _ensureSellLiquidity ({ sellToken, buyToken, from, isRoutineCheck = false }) {
    let soldTokens
    try {
      soldTokens = await this._botService
        .ensureSellLiquidity({ sellToken, buyToken, from })
        .catch(error => _handleError(sellToken, buyToken, error))
      
      if (soldTokens) {
        // The bot sold some tokens
        auctionLogger.info(sellToken, buyToken,
          "I've sold %d %s tokens to ensure liquidity",
          soldTokens.amount,
          soldTokens.sellToken
        )

        if (isRoutineCheck) {
          auctionLogger.warn(sellToken, buyToken, "The liquidity was enssured by the routine check. Make sure there's no problem getting events")
        }
        
      } else {
        // The bot didn't have to do anything
        auctionLogger.debug(sellToken, buyToken,
          'There was no need to sell any token to ensure liquidity',
          sellToken, buyToken
        )
      }
    } catch (error) {
      _handleError(sellToken, buyToken, error)
      soldTokens = null
    }

    return soldTokens
  }
}

function _handleError (sellToken, buyToken, error) {
  auctionLogger.error(sellToken, buyToken,
    'There was an error ensuring liquidity: ' + error.toString())
  console.error(error)
}

module.exports = SellLiquidityBot
