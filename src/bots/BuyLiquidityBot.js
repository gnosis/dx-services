const loggerNamespace = 'dx-service:bots:BuyLiquidityBot'
const AuctionLogger = require('../helpers/AuctionLogger')
const Bot = require('./Bot')
const Logger = require('../helpers/Logger')

const logger = new Logger(loggerNamespace)
const auctionLogger = new AuctionLogger(loggerNamespace)
const ENSURE_LIQUIDITY_PERIODIC_CHECK_MILLISECONDS = 60 * 1000

class BuyLiquidityBot extends Bot {
  constructor ({ name, eventBus, liquidityService, botAddress, markets }) {
    super(name)
    this._eventBus = eventBus
    this._liquidityService = liquidityService
    this._botAddress = botAddress
    this._markets = markets

    this._lastCheck = null
    this._lastBuy = null
    this._lastError = null
  }

  async _doStart () {
    logger.debug({ msg: 'Initialized bot' })

    // Check the liquidity periodically
    setInterval(() => {
      this._markets.forEach(market => {
        const sellToken = market.tokenA
        const buyToken = market.tokenB
        this._doRoutineLiquidityCheck(sellToken, buyToken)
      })
    }, ENSURE_LIQUIDITY_PERIODIC_CHECK_MILLISECONDS)
  }

  async _doStop () {
    logger.debug({ msg: 'Bot stopped' })
  }

  async _doRoutineLiquidityCheck (sellToken, buyToken) {
    // Do ensure liquidity on the market
    auctionLogger.debug({
      sellToken,
      buyToken,
      msg: "Doing a routine check. Let's see if we need to ensure the liquidity"
    })
    return this._ensureBuyLiquidity({
      sellToken,
      buyToken,
      from: this._botAddress
    })
  }

  async _ensureBuyLiquidity ({ sellToken, buyToken, from }) {
    this._lastCheck = new Date()
    let liquidityWasEnsured
    try {
      liquidityWasEnsured = await this._liquidityService
        .ensureBuyLiquidity({ sellToken, buyToken, from })
        .then(boughtTokens => {
          let liquidityWasEnsured = boughtTokens.length > 0
          if (liquidityWasEnsured) {
            // The bot bought some tokens
            this._lastBuy = new Date()
            boughtTokens.forEach(buyOrder => {
              auctionLogger.info({
                sellToken,
                buyToken,
                msg: "I've bought %d %s (%d USD) to ensure BUY liquidity",
                params: [
                  buyOrder.amount.div(1e18),
                  buyOrder.sellToken,
                  buyOrder.amountInUSD
                ],
                notify: true
              })
            })
          } else {
            // The bot didn't have to do anything
            auctionLogger.debug({
              sellToken,
              buyToken,
              msg: 'Nothing to do'
            })
          }

          return true
        })
    } catch (error) {
      this.lastError = new Date()
      liquidityWasEnsured = false
      this._handleError(sellToken, buyToken, error)
    }

    return liquidityWasEnsured
  }

  _handleError (sellToken, buyToken, error) {
    auctionLogger.error({
      sellToken,
      buyToken,
      msg: 'There was an error buy ensuring liquidity with the account %s: %s',
      params: [ this._botAddress, error ],
      error
    })
  }

  async getInfo () {
    return {
      botAddress: this._botAddress,
      lastCheck: this._lastCheck,
      lastBuy: this._lastBuy,
      lastError: this._lastError
    }
  }
}

module.exports = BuyLiquidityBot
