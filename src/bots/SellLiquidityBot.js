const loggerNamespace = 'dx-service:bots:SellLiquidityBot'
const AuctionLogger = require('../helpers/AuctionLogger')
const Bot = require('./Bot')
const Logger = require('../helpers/Logger')
const getVersion = require('../helpers/getVersion')

const logger = new Logger(loggerNamespace)
const auctionLogger = new AuctionLogger(loggerNamespace)
const events = require('../helpers/events')
const ENSURE_LIQUIDITY_PERIODIC_CHECK_MILLISECONDS = 60 * 1000

class SellLiquidityBot extends Bot {
  constructor ({
    name,
    eventBus,
    liquidityService,
    botAddress,
    markets,
    slackClient,
    botTransactionsSlackChannel
  }) {
    super(name)
    this._eventBus = eventBus
    this._liquidityService = liquidityService
    this._botAddress = botAddress
    this._markets = markets
    this._slackClient = slackClient
    this._botTransactionsSlackChannel = botTransactionsSlackChannel

    this._lastCheck = null
    this._lastSell = null
    this._lastError = null

    this._botInfo = 'SellLiquidityBot - v' + getVersion()
  }

  async _doStart () {
    logger.debug({ msg: 'Initialized bot' })

    // Ensure the sell liquidity when an aunction has ended
    this._eventBus.listenTo(events.EVENT_AUCTION_CLEARED, ({ eventName, data }) => {
      const { sellToken, buyToken } = data

      // Do ensure liquidity on the market
      auctionLogger.info({
        sellToken,
        buyToken,
        msg: "Auction ended. Let's ensure SELL liquidity"
      })
      this._ensureSellLiquidity({
        sellToken,
        buyToken,
        from: this._botAddress
      })
    })

    // Backup strategy: From time to time, we ensure the liquidity
    // Used only in case events fail to notify the bot
    setInterval(() => {
      this._markets.forEach(market => {
        const sellToken = market.tokenA
        const buyToken = market.tokenB

        // Do ensure liquidity on the market
        auctionLogger.debug({
          sellToken,
          buyToken,
          msg: "Doing a routine check. Let's see if we need to ensure the sell liquidity"
        })
        this._ensureSellLiquidity({
          sellToken,
          buyToken,
          from: this._botAddress
        }).then(liquidityWasEnsured => {
          if (liquidityWasEnsured) {
            auctionLogger.warn({
              sellToken,
              buyToken,
              msg: "The sell liquidity was enssured by the routine check. Make sure there's no problem getting events"
            })
          }
        })
      })
    }, ENSURE_LIQUIDITY_PERIODIC_CHECK_MILLISECONDS)
  }

  async _doStop () {
    logger.debug({ msg: 'Bot stopped' })
  }

  async _ensureSellLiquidity ({ sellToken, buyToken, from }) {
    this._lastCheck = new Date()
    let liquidityWasEnsured
    try {
      liquidityWasEnsured = await this._liquidityService
        .ensureSellLiquidity({ sellToken, buyToken, from })
        .then(soldTokens => {
          let liquidityWasEnsured = soldTokens.length > 0
          if (liquidityWasEnsured) {
            // The bot sold some tokens
            this._lastSell = new Date()
            soldTokens.forEach(sellOrder => {
              // Notify the sold tokens
              this._notifySoldTokens(sellOrder)
            })
          } else {
            // The bot didn't have to do anything
            auctionLogger.debug({
              sellToken,
              buyToken,
              msg: 'Nothing to do'
            })
          }

          return liquidityWasEnsured
        })
    } catch (error) {
      liquidityWasEnsured = false
      this._lastError = new Date()
      this._handleError(sellToken, buyToken, error)
    }

    return liquidityWasEnsured
  }

  _notifySoldTokens (sellOrder) {
    const {
      sellToken,
      buyToken,
      amount,
      amountInUSD,
      auctionIndex
    } = sellOrder
    // Log sold tokens
    const amountInTokens = amount.div(1e18)
    const soldTokensString = amountInTokens + " " + sellToken

    auctionLogger.info({
      sellToken,
      buyToken,
      msg: "I've sold %s (%d USD) in auction %d to ensure SELL liquidity",
      params: [
        soldTokensString,
        amountInUSD,
        auctionIndex
      ],
      notify: true
    })

    /* eslint quotes: 0 */
    // Notify to slack
    if (this._botTransactionsSlackChannel && this._slackClient.isEnabled()) {
      this._slackClient
        .postMessage({
          "channel": this._botTransactionsSlackChannel,
          "attachments": [
            {
              "color": "good",
              "title": "The bot has sold " + soldTokensString,
              "text": "The bot has sold tokens to ensure the sell liquidity.",
              "fields": [
                {
                  "title": "Token pair",
                  "value": sellToken + '-' + buyToken,
                  "short": false
                }, {
                  "title": "Auction index",
                  "value": auctionIndex,
                  "short": false
                }, {
                  "title": "Sold tokens",
                  "value": soldTokensString,
                  "short": false
                }, {
                  "title": "USD worth",
                  "value": '$' + amountInUSD,
                  "short": false
                }
              ],
              footer: this.botInfo
            }
          ]
        })
        .catch(error => {
          logger.error({
            msg: 'Error notifing sold tokens to Slack: ' + error.toString(),
            error
          })
        })
    }
  }

  _handleError (sellToken, buyToken, error) {
    auctionLogger.error({
      sellToken,
      buyToken,
      msg: 'There was an error ensuring sell liquidity with the account %s: %s',
      params: [ this._botAddress, error ],
      error
    })
  }

  async getInfo () {
    return {
      botAddress: this._botAddress,
      lastCheck: this._lastCheck,
      lastSell: this._lastSell,
      lastError: this._lastError
    }
  }
}

module.exports = SellLiquidityBot
