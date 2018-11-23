const loggerNamespace = 'dx-service:bots:BalanceCheckBot'
const Bot = require('./Bot')
const Logger = require('../helpers/Logger')
const logger = new Logger(loggerNamespace)
const assert = require('assert')

const formatUtil = require('../helpers/formatUtil')
const numberUtil = require('../helpers/numberUtil')

const BOT_TYPE = 'BalanceCheckBot'

const getEthereumClient = require('../getEthereumClient')
const getAddress = require('../helpers/getAddress')
const getLiquidityService = require('../services/LiquidityService')
const getDxInfoService = require('../services/DxInfoService')
const getSlackRepo = require('../repositories/SlackRepo')

const MINIMUM_AMOUNT_IN_USD_FOR_TOKENS = process.env.BALANCE_CHECK_THRESHOLD_USD || 5000 // $5000
const MINIMUM_AMOUNT_FOR_ETHER = (process.env.BALANCE_CHECK_THRESHOLD_ETHER || 0.4) * 1e18 // 0.4 WETH

const checkTimeMinutes = process.env.BALANCE_BOT_CHECK_TIME_MINUTES || 15 // 15 min
const slackThresholdMinutes = process.env.BALANCE_BOT_SLACK_THESHOLD_MINUTES || (4 * 60) // 4h
const PERIODIC_CHECK_MILLISECONDS = checkTimeMinutes * 60 * 1000
const MINIMUM_TIME_BETWEEN_SLACK_NOTIFICATIONS = slackThresholdMinutes * 60 * 1000

class BalanceCheckBot extends Bot {
  constructor ({
    name,
    botAddress,
    accountIndex,
    tokens,
    notifications,
    minimumAmountForEther,
    minimumAmountInUsdForToken
  }) {
    super(name, BOT_TYPE)
    assert(tokens, 'tokens is required')
    assert(notifications, 'notifications is required')

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

    this._tokens = tokens
    this._notifications = notifications
    this._minimumAmountForEther = minimumAmountForEther
    this._minimumAmountInUsdForToken = minimumAmountInUsdForToken

    this._lastCheck = null
    this._lastWarnNotification = null
    this._lastError = null
    this._lastSlackEtherBalanceNotification = null
    this._lastSlackTokenBalanceNotification = null
  }

  async _doInit () {
    logger.debug('Init Balance Check Bot: ' + this.name)
    const [
      ethereumClient,
      dxInfoService,
      liquidityService,
      slackRepo
    ] = await Promise.all([
      getEthereumClient(),
      getDxInfoService(),
      getLiquidityService(),
      getSlackRepo()
    ])
    this._ethereumClient = ethereumClient
    this._dxInfoService = dxInfoService
    this._liquidityService = liquidityService
    this._slackRepo = slackRepo

    // Get bot address
    if (!this._botAddress) {
      if (this._accountIndex !== undefined) {
        this._botAddress = await getAddress(this._accountIndex)
      } else {
        throw new Error('Bot address or account index has to be provided')
      }
    }
  }

  async _doStart () {
    logger.debug({ msg: 'Initialized bot: ' + this.name })

    // Check the bots balance periodically
    this._checkBalance()
    setInterval(() => {
      return this._checkBalance()
    }, PERIODIC_CHECK_MILLISECONDS)
  }

  async _doStop () {
    logger.debug({ msg: 'Bot stopped: ' + this.name })
  }

  async _checkBalance () {
    this._lastCheck = new Date()
    let botHasEnoughTokens
    try {
      const account = this._botAddress

      // Get ETH balance
      const balanceOfEtherPromise = this._dxInfoService.getBalanceOfEther({
        account })

      // Get balance of ERC20 tokens
      const balanceOfTokensPromise = this._liquidityService.getBalances({
        tokens: this._tokens,
        address: account
      })

      const [ balanceOfEther, balanceOfTokens ] = await Promise.all([
        balanceOfEtherPromise,
        balanceOfTokensPromise
      ])

      // Check if the account has ETHER below the minimum amount
      const minimumAmountForEther = this._minimumAmountForEther || MINIMUM_AMOUNT_FOR_ETHER
      if (balanceOfEther < minimumAmountForEther) {
        this._lastWarnNotification = new Date()
        // Notify lack of ether
        this._notifyLackOfEther(balanceOfEther, account, minimumAmountForEther)
      }

      // Check if there are tokens below the minimum amount
      const minimumAmountInUsdForToken = this._minimumAmountInUsdForToken ||
        MINIMUM_AMOUNT_IN_USD_FOR_TOKENS
      const tokenBelowMinimum = balanceOfTokens.filter(balanceInfo => {
        return balanceInfo.amountInUSD.lessThan(minimumAmountInUsdForToken)
      })

      if (tokenBelowMinimum.length > 0) {
        // Notify lack of tokens
        this._notifyLackOfTokens(tokenBelowMinimum, account, minimumAmountInUsdForToken)
      } else {
        logger.debug('Everything is fine for account: %s', account)
      }

      botHasEnoughTokens = true
    } catch (error) {
      this.lastError = new Date()
      botHasEnoughTokens = false
      logger.error({
        msg: 'There was an error checking the balance for the bot: %s',
        params: [ error ],
        error
      })
    }

    return botHasEnoughTokens
  }

  async getInfo () {
    return {
      botAddress: this._botAddress,
      tokens: this._tokens,
      lastCheck: this._lastCheck,
      lastWarnNotification: this._lastWarnNotification,
      lastError: this._lastError,
      lastSlackEtherBalanceNotification: this._lastSlackEtherBalanceNotification,
      lastSlackTokenBalanceNotification: this._lastSlackTokenBalanceNotification
    }
  }

  _notifyLackOfEther (balanceOfEther, account, minimumAmountForEther) {
    const minimumAmount = minimumAmountForEther * 1e-18
    const balance = balanceOfEther.div(1e18).valueOf()

    const message = 'The bot account has ETHER balance below ' + minimumAmount

    // Log message
    logger.warn({
      msg: message,
      contextData: {
        extra: {
          balanceOfEther: balance,
          account
        }
      },
      notify: true
    })

    // Notify to slack
    this._notifyToSlack({
      name: 'Ether Balance',
      lastNotificationVariableName: '_lastSlackEtherBalanceNotification',
      message: {
        attachments: [{
          color: 'danger',
          title: message,
          fields: [
            {
              title: 'Ether balance',
              value: numberUtil.roundDown(balance, 4) + ' ETH',
              short: false
            }, {
              title: 'Bot account',
              value: account,
              short: false
            }
          ],
          footer: this.botInfo
        }]
      }
    })
  }

  _notifyLackOfTokens (tokenBelowMinimum, account, minimumAmountInUsdForToken) {
    // Notify which tokens are below the minimum value
    this._lastWarnNotification = new Date()
    const tokenBelowMinimumValue = tokenBelowMinimum.map(balanceInfo => {
      return Object.assign(balanceInfo, {
        amount: balanceInfo.amount.div(1e18).valueOf(),
        amountInUSD: balanceInfo.amountInUSD.valueOf()
      })
    })

    const message = `The bot account has tokens below the ${minimumAmountInUsdForToken} USD worth of value`
    const tokenNames = tokenBelowMinimum.map(balanceInfo => balanceInfo.token).join(', ')
    let fields = tokenBelowMinimumValue.map(({ token, amount, amountInUSD }) => ({
      title: token,
      value: numberUtil.roundDown(amount, 4) + ' ' + token + ' ($' + amountInUSD + ')',
      short: false
    }))

    fields = [].concat({
      title: 'Bot account',
      value: account,
      short: false
    }, fields)

    // Log message
    logger.warn({
      msg: message + ': ' + tokenNames,
      contextData: {
        extra: {
          account,
          tokenBelowMinimum: tokenBelowMinimumValue
        }
      },
      notify: true
    })

    this._notifications.forEach(({ type, channel }) => {
      switch (type) {
        case 'slack':
          if (this._slackRepo.isEnabled()) {
            // Notify to slack
            this._notifyToSlack({
              channel,
              name: 'Token Balances',
              lastNotificationVariableName: '_lastSlackTokenBalanceNotification',
              message: {
                attachments: [{
                  color: 'danger',
                  title: message,
                  text: 'The tokens below the threshold are:',
                  fields,
                  footer: this.botInfo
                }]
              }
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

  async _notifyToSlack ({ channel, name, lastNotificationVariableName, message }) {
    const now = new Date()
    const lastNotification = this[lastNotificationVariableName]

    let nextNotification
    if (lastNotification) {
      nextNotification = new Date(
        lastNotification.getTime() +
        MINIMUM_TIME_BETWEEN_SLACK_NOTIFICATIONS
      )
    } else {
      nextNotification = now
    }
    if (nextNotification <= now) {
      logger.info('Notifying "%s" to slack', name)
      message.channel = channel

      this._slackRepo
        .postMessage(message)
        .then(() => {
          this[lastNotificationVariableName] = now
        })
        .catch(error => {
          logger.error({
            msg: 'Error notifing lack of ether to Slack: ' + error.toString(),
            error
          })
        })
    } else {
      logger.info(`The slack notifcation for "%s" was sent too soon. Next \
one will be %s`, name, formatUtil.formatDateFromNow(nextNotification))
    }
  }
}

module.exports = BalanceCheckBot
