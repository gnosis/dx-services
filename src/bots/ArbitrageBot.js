const loggerNamespace = 'dx-service:bots:ArbitrageLiquidityBot'
const AuctionLogger = require('../helpers/AuctionLogger')
const Bot = require('./Bot')
const Logger = require('../helpers/Logger')
const assert = require('assert')

const logger = new Logger(loggerNamespace)
const auctionLogger = new AuctionLogger(loggerNamespace)

const BOT_TYPE = 'ArbitrageBot'
const getEthereumClient = require('../helpers/ethereumClient')
const getEventBus = require('../getEventBus')
const getArbitrageService = require('../services/ArbitrageService')
const getSlackRepo = require('../repositories/SlackRepo')

const ENSURE_LIQUIDITY_PERIODIC_CHECK_MILLISECONDS =
  process.env.ARBITRAGE_LIQUIDITY_BOT_CHECK_TIME_MS || (60 * 1000) // 1 min

class ArbitrageBot extends Bot {
  constructor ({
    name,
    botAddress,
    accountIndex,
    markets,
    notifications,
    checkTimeInMilliseconds = ENSURE_LIQUIDITY_PERIODIC_CHECK_MILLISECONDS
  }) {
    super(name, BOT_TYPE)
    assert(markets, 'markets is required')
    assert(notifications, 'notifications is required')
    assert(checkTimeInMilliseconds, 'checkTimeInMilliseconds is required')

    if (botAddress) {
      // Config using bot address
      assert(botAddress, 'botAddress is required')
      this._botAddress = botAddress
    } else {
      // Config using bot account address
      assert(accountIndex !== undefined, '"botAddress" or "accountIndex" is required')
      this._accountIndex = accountIndex
    }

    // If notification has slack, validate
    const slackNotificationConf = notifications.find(notificationType => notificationType.type === 'slack')
    if (slackNotificationConf) {
      assert(slackNotificationConf.channel, 'Slack notification config required the "channel"')
    }

    this._markets = markets
    this._notifications = notifications
    this._checkTimeInMilliseconds = checkTimeInMilliseconds

    this._lastCheck = null
    this._lastBuy = null
    this._lastError = null
  }

  async _doInit () {
    logger.debug('Init Arbitrage Bot: ' + this.name)
    const [
      ethereumClient,
      eventBus,
      arbitrageService,
      slackRepo
    ] = await Promise.all([
      getEthereumClient(),
      getEventBus(),
      getArbitrageService(),
      getSlackRepo()
    ])
    this._ethereumClient = ethereumClient
    this._eventBus = eventBus
    this._arbitrageService = arbitrageService
    this._slackRepo = slackRepo

    // Set bot address
    await this.setAddress()
  }

  async _doStart () {
    logger.debug({ msg: 'Initialized bot: ' + this.name })

    // Check the opportunity periodically
    setInterval(() => {
      this._markets.forEach(market => {
        const sellToken = market.tokenA
        const buyToken = market.tokenB
        this._doRoutineArbitrageCheck(sellToken, buyToken)
      })
    }, this._checkTimeInMilliseconds)
  }

  async _doStop () {
    logger.debug({ msg: 'Bot stopped: ' + this.name })
  }

  async _doRoutineArbitrageCheck (sellToken, buyToken) {
    // Do ensure arbitrage on the market
    auctionLogger.debug({
      sellToken,
      buyToken,
      msg: "Doing a routine check. Let's see if we need to arbitrage"
    })
    return this._arbitrageCheck({
      sellToken,
      buyToken,
      from: this._botAddress
    })
  }

  async _arbitrageCheck ({ sellToken, buyToken, from }) {
    this._lastCheck = new Date()
    let liquidityWasEnsured
    try {
      liquidityWasEnsured = await this._arbitrageService
        .checkUniswapArbitrage({ sellToken, buyToken, from })
        .then(successfulArbitrages => {
          let liquidityWasEnsured = successfulArbitrages.length > 0
          if (liquidityWasEnsured) {
            // The bot ran some arbitrage transactions
            this._lastBuy = new Date()
            successfulArbitrages.forEach(arbitrage => {
              this._notifyArbitrage(arbitrage)
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

  _notifyArbitrage (arbitrage) {
    const {
      type,
      arbToken,
      amount,
      expectedProfit,
      actualProfit,
      dutchPrice,
      uniswapPrice,
      tx
    } = arbitrage

    auctionLogger.info({
      type,
      arbToken,
      amount,
      expectedProfit,
      actualProfit,
      dutchPrice,
      uniswapPrice,
      tx,
      msg: `Successful ${type} arbitrage`,
      params: tx.receipt.logs,
      notify: true
    })

    // TODO: Improve notifications. Decouple this into a strategy pattern
    this._notifications.forEach(({ type, channel }) => {
      switch (type) {
        case 'slack':
          // Notify to slack
          if (this._slackRepo.isEnabled()) {
            this._notifyArbitrageSlack({
              channel,
              type,
              arbToken,
              amount,
              expectedProfit,
              actualProfit,
              dutchPrice,
              uniswapPrice,
              tx
            })
          }
          break
        case 'email':
          throw new Error('Not implemented yet')
        default:
          logger.error({
            msg: 'Error notification type is unknown: ' + type
          })
      }
    })
  }

  _notifyArbitrageSlack ({ channel, type, arbToken, amount, expectedProfit, actualProfit, dutchPrice, uniswapPrice, tx }) {
    this._slackRepo
      .postMessage({
        channel,
        attachments: [
          {
            color: 'good',
            title: 'Successful ' + type,
            text: 'The bot has arbitraged tokens because of a(n) ' + type,
            fields: [
              {
                title: 'Bot name',
                value: this.name,
                short: false
              }, {
                title: 'Token pair',
                value: arbToken + '-WETH',
                short: false
              }, {
                title: 'Tx hash',
                value: tx.transactionHash,
                short: false
              }, {
                title: 'Amount spend (wei)',
                value: amount,
                short: false
              }, {
                title: 'Expected Profit (wei)',
                value: expectedProfit,
                short: false
              }, {
                title: 'Actual Profit (wei)',
                value: actualProfit,
                short: false
              }, {
                title: 'Dutch Price',
                value: dutchPrice,
                short: false
              }, {
                title: 'uniswapPrice',
                value: uniswapPrice,
                short: false
              }
            ],
            footer: this.botInfo
          }
        ]
      })
      .catch(error => {
        logger.error({
          msg: 'Error notifing bought tokens to Slack: ' + error.toString(),
          error
        })
      })
  }

  _handleError (sellToken, buyToken, error) {
    auctionLogger.error({
      sellToken,
      buyToken,
      msg: 'There was an error running an arbitrage with the account %s: %s',
      params: [ this._botAddress, error ],
      error
    })
  }

  async getInfo () {
    return {
      botAddress: this._botAddress,
      lastCheck: this._lastCheck,
      lastBuy: this._lastBuy,
      lastError: this._lastError,
      notifications: this._notifications,
      checkTimeInMilliseconds: this._checkTimeInMilliseconds,
      markets: this._markets
    }
  }
}

module.exports = ArbitrageBot
