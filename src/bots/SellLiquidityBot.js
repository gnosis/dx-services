const loggerNamespace = 'dx-service:bots:SellLiquidityBot'
const AuctionLogger = require('../helpers/AuctionLogger')
const Bot = require('./Bot')
const Logger = require('../helpers/Logger')

const logger = new Logger(loggerNamespace)
const auctionLogger = new AuctionLogger(loggerNamespace)
const events = require('../helpers/events')
const ENSURE_LIQUIDITY_PERIODIC_CHECK_MILLISECONDS = 30 * 1000

class SellLiquidityBot extends Bot {
  constructor ({ name, eventBus, botService, botAddress, markets }) {
    super(name)
    this._eventBus = eventBus
    this._botService = botService
    this._botAddress = botAddress
    this._markets = markets
  }

  async _doStart () {
    logger.debug('Initialized bot')

    // Ensure the sell liquidity when an aunction has ended
    this._eventBus.listenTo(events.EVENT_AUCTION_CLEARED, ({ eventName, data }) => {
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

  async _doStop () {
    logger.debug('Bot stopped')
  }

  async _onAuctionCleared (eventName, data) {
    const { sellToken, buyToken } = data

    // Do ensure liquidity on the market
    auctionLogger.info(sellToken, buyToken, "Auction ended. Let's ensure liquidity")
    return this._ensureSellLiquidity({
      sellToken,
      buyToken,
      from: this._botAddress
    })
  }

  async _ensureSellLiquidity ({ sellToken, buyToken, from, isRoutineCheck = false }) {
    let liquidityWasEnsured
    try {
      liquidityWasEnsured = await this._botService
        .ensureSellLiquidity({ sellToken, buyToken, from })
        .then(soldTokens => {
          // soldTokens is:
          //  * NULL when nothing was sold
          //  * An object with {amount, sellToken, buyToken} when the botService
          //    had to sell tokens
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
              'Nothing to do'
            )
          }

          return true
        })
        .catch(error => {
          liquidityWasEnsured = false
          this._handleError(sellToken, buyToken, error)
        })
    } catch (error) {
      liquidityWasEnsured = false
      this._handleError(sellToken, buyToken, error)
    }

    return liquidityWasEnsured
  }

  async _doRoutineLiquidityCheck (sellToken, buyToken) {
    // Do ensure liquidity on the market
    auctionLogger.debug(sellToken, buyToken, "Doing a routine check. Let's see if we need to ensure the liquidity")
    return this._ensureSellLiquidity({
      sellToken,
      buyToken,
      from: this._botAddress,
      isRoutineCheck: true
    })
  }

  _handleError (sellToken, buyToken, error) {
    auctionLogger.error(sellToken, buyToken,
      'There was an error ensuring liquidity with the account %s: %s',
      this._botAddress,
      error.toString()
    )
    console.error(error)
  }

  async getInfo () {
    return {
      botAddress: this._botAddress
    }
  }
}

module.exports = SellLiquidityBot
