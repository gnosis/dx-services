const loggerNamespace = 'dx-service:bots:HighSellVolumeBot'
const AuctionLogger = require('../helpers/AuctionLogger')
const Bot = require('./Bot')
const Logger = require('../helpers/Logger')

const logger = new Logger(loggerNamespace)
const auctionLogger = new AuctionLogger(loggerNamespace)

const numberUtil = require('../helpers/numberUtil')

const ENSURE_LIQUIDITY_PERIODIC_CHECK_MILLISECONDS =
  process.env.BUY_LIQUIDITY_BOT_CHECK_TIME_MS || (60 * 1000) // 1 min

class HighSellVolumeBot extends Bot {
  constructor ({
    name,
    eventBus,
    liquidityService,
    dxInfoService,
    marketService,
    botAddress,
    markets,
    slackClient,
    botTransactionsSlackChannel,
    // buyLiquidityRules,
    notifications,
    checkTimeInMilliseconds = ENSURE_LIQUIDITY_PERIODIC_CHECK_MILLISECONDS
  }) {
    super(name)

    this._eventBus = eventBus
    this._liquidityService = liquidityService
    this._dxInfoService = dxInfoService
    this._marketService = marketService
    this._botAddress = botAddress
    this._markets = markets
    this._slackClient = slackClient
    this._botTransactionsSlackChannel = botTransactionsSlackChannel
    // this._buyLiquidityRules = buyLiquidityRules
    this._notifications = notifications
    this._checkTimeInMilliseconds = checkTimeInMilliseconds

    this._lastCheck = null
    this._lastBuy = null
    this._lastError = null
  }

  async _doStart () {
    logger.debug({ msg: 'Initialized bot: ' + this.name })

    this._markets.forEach(market => {
      const sellToken = market.tokenA
      const buyToken = market.tokenB
      this._doRoutineLiquidityCheck(sellToken, buyToken)
    })

    // Check the liquidity periodically
    setInterval(() => {
      this._markets.forEach(market => {
        const sellToken = market.tokenA
        const buyToken = market.tokenB
        this._doRoutineLiquidityCheck(sellToken, buyToken)
      })
    }, this._checkTimeInMilliseconds)
  }

  async _doStop () {
    logger.debug({ msg: 'Bot stopped: ' + this.name })
  }

  async _doRoutineLiquidityCheck (sellToken, buyToken) {
    // Do ensure liquidity on the market
    auctionLogger.debug({
      sellToken,
      buyToken,
      msg: "Doing a routine check. Let's see if we will be able to ensure the liquidity"
    })
    return this._checkBuyLiquidity({
      sellToken,
      buyToken,
      from: this._botAddress
    })
  }

  async _checkBuyLiquidity ({ sellToken, buyToken, from }) {
    this._lastCheck = new Date()
    let liquidityWasChecked
    // const buyLiquidityRules = this._buyLiquidityRules
    try {
      // We must check both auction sides
      await this._checkEnoughBalance({ sellToken, buyToken, from })
      await this._checkEnoughBalance({ sellToken: buyToken, buyToken: sellToken, from })

      liquidityWasChecked = true
    } catch (error) {
      this.lastError = new Date()
      liquidityWasChecked = false
      this._handleError(sellToken, buyToken, error)
    }

    return liquidityWasChecked
  }

  async _checkEnoughBalance ({ sellToken, buyToken, from }) {
    logger.debug('Checking enough balance for %s-%s in %s', sellToken, buyToken, from)
    const auctionSellVolumePromise = this._dxInfoService.getSellVolume({
      sellToken, buyToken })
    const accountBalancesPromise = this._dxInfoService.getBalances({
      address: from })
    const auctionIndexPromise = this._dxInfoService.getAuctionIndex({
      sellToken, buyToken })
    const externalPricePromise = this._marketService.getPrice({
      tokenA: sellToken, tokenB: buyToken })
    const [ auctionSellVolume, accountBalances, auctionIndex, externalPrice ] =
    await Promise.all([
      auctionSellVolumePromise,
      accountBalancesPromise,
      auctionIndexPromise,
      externalPricePromise
    ])

    const lastAvailableClosingPrice = await this._dxInfoService.getLastClosingPrices({
      sellToken, buyToken, auctionIndex })
    const tokenBalance = accountBalances.find(balance => {
      if (balance.token === buyToken) {
        return balance
      }
    })
    const estimatedPrice = lastAvailableClosingPrice[lastAvailableClosingPrice.length - 1]
      ? lastAvailableClosingPrice[lastAvailableClosingPrice.length - 1]
      : externalPrice
    const estimatedBuyVolume = numberUtil.fromWei(auctionSellVolume).mul(numberUtil.toBigNumber(estimatedPrice))
    logger.debug('Auction sell volume is %s %s and we have %s %s. With last available price %s %s/%s that should mean we need %s %s',
      numberUtil.fromWei(auctionSellVolume), sellToken,
      tokenBalance.amount.toNumber(), tokenBalance.token,
      estimatedPrice, sellToken, buyToken,
      estimatedBuyVolume.toNumber(), buyToken)

    if (estimatedBuyVolume.mul(1.10).greaterThan(tokenBalance.amount)) {
      logger.debug('We estimate we won`t be able to buy everything')
      this._notifyBalanceBelowEstimate({ sellToken, buyToken, from, balance: tokenBalance.amount, estimatedBuyVolume })
    } else {
      logger.debug('We will be able to buy everything')
    }
  }

  _notifyBalanceBelowEstimate ({ sellToken, buyToken, from, balance, estimatedBuyVolume }) {
    // Log sold tokens
    // const amountInTokens = amount.div(1e18)
    // const boughtTokensString = amountInTokens + ' ' + buyToken

    auctionLogger.info({
      sellToken,
      buyToken,
      msg: "I've detected a high sell volume %s and we only have %s to ensure BUY liquidity",
      params: [
        estimatedBuyVolume,
        balance
      ],
      notify: true
    })

    this._notifications.forEach(({ type, channel }) => {
      switch (type) {
        case 'slack':
          // Notify to slack
          if (this._botTransactionsSlackChannel && this._slackClient.isEnabled()) {
            this._notifyBuyedTokensSlack({
              channel,
              sellToken,
              buyToken,
              from,
              balance,
              estimatedBuyVolume
            })
          }
          break
        case 'email':
        default:
          logger.error({
            msg: 'Error notification type is unknown: ' + type
          })
      }
    })
  }

  _notifLowBalanceSlack ({ channel, sellToken, buyToken, from, balance, estimatedBuyVolume }) {
    this._slackClient
      .postMessage({
        channel: channel || this._botTransactionsSlackChannel,
        attachments: [
          {
            color: 'danger',
            title: 'High sell volume detected for ' + sellToken + '-' + buyToken,
            text: 'The bot has detected a high sell volume that won`t be able to buy.',
            fields: [
              {
                title: 'Bot name',
                value: this.name,
                short: false
              }, {
                title: 'Account',
                value: from,
                short: false
              }, {
                title: 'Token pair',
                value: sellToken + '-' + buyToken,
                short: false
              }, {
                title: 'Balance',
                value: balance + ' ' + buyToken,
                short: false
              }, {
                title: 'Estimated buy volume',
                value: estimatedBuyVolume + ' ' + buyToken,
                short: false
              }
            ],
            footer: this.botInfo
          }
        ]
      })
      .catch(error => {
        logger.error({
          msg: 'Error notifing high sell volume to Slack: ' + error.toString(),
          error
        })
      })
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
      lastError: this._lastError,
      notifications: this._notifications,
      defaultSlackChannel: this._botTransactionsSlackChannel,
      checkTimeInMilliseconds: this._checkTimeInMilliseconds,
      markets: this._markets
    }
  }
}

module.exports = HighSellVolumeBot
