const loggerNamespace = 'dx-service:bots:BalanceCheckBot'
const Bot = require('./Bot')
const Logger = require('../helpers/Logger')
const logger = new Logger(loggerNamespace)
const formatUtil = require('../helpers/formatUtil')

const MINIMUM_AMOUNT_IN_USD_FOR_TOKENS = 5000 // $5000
const MINIMUM_AMOUNT_FOR_ETHER = 0.4 * 1e18 // 0.4 WETH
const PERIODIC_CHECK_MILLISECONDS = 15 * 60 * 1000 // 15 min
const MINIMUN_TIME_BETWEEN_SLACK_NOTIFICATIONS = 4 * 60 * 60 * 1000 // 4h

class BalanceCheckBot extends Bot {
  constructor ({
    name,
    eventBus,
    liquidityService,
    dxInfoService,
    botAddress,
    markets,
    slackClient,
    botFundingSlackChannel
  }) {
    super(name)
    this._eventBus = eventBus
    this._liquidityService = liquidityService
    this._dxInfoService = dxInfoService
    this._slackClient = slackClient
    this._botFundingSlackChannel = botFundingSlackChannel

    this._botAddress = botAddress

    this._tokens = markets.reduce((accumulator, tokenPair) => {
      if (!accumulator.includes(tokenPair.tokenA)) {
        accumulator.push(tokenPair.tokenA)
      }
      if (!accumulator.includes(tokenPair.tokenB)) {
        accumulator.push(tokenPair.tokenB)
      }
      return accumulator
    }, [])

    this._lastCheck = null
    this._lastWarnNotification = null
    this._lastError = null
    this._lastSlackEtherBalanceNotification = null
    this._lastSlackTokenBalanceNotification = null
  }

  async _doStart () {
    logger.debug({ msg: 'Initialized bot' })

    // Check the bots balance periodically
    this._checkBalance()
    setInterval(() => {
      return this._checkBalance()
    }, PERIODIC_CHECK_MILLISECONDS)
  }

  async _doStop () {
    logger.debug({ msg: 'Bot stopped' })
  }

  async _checkBalance () {
    this._lastCheck = new Date()
    let botHasEnoughTokens
    try {
      const [ balanceOfEther, balancesOfTokens ] = await Promise.all([
        // Get WETH balance
        this._dxInfoService.getBalanceOfEther({ account: this._botAddress }),

        // Get balance of ERC20 tokens
        this._liquidityService.getBalances({
          tokens: this._tokens,
          address: this._botAddress
        })
      ])

      // Check if the account has ETHER below the minimum amount
      if (balanceOfEther < MINIMUM_AMOUNT_FOR_ETHER) {
        this._lastWarnNotification = new Date()
        // Notify lack of ether
        this._notifyLackOfEther(balanceOfEther)
      }

      // Check if there are tokens below the minimun amount
      const tokenBelowMinimun = balancesOfTokens.filter(balanceInfo => {
        return balanceInfo.amountInUSD.lessThan(MINIMUM_AMOUNT_IN_USD_FOR_TOKENS)
      })

      if (tokenBelowMinimun.length > 0) {
        // Notify lack of tokens
        this._notifyLackOfTokens(tokenBelowMinimun)
      } else {
        logger.debug('Everything is fine')
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
      lastCheck: this._lastCheck,
      lastWarnNotification: this._lastWarnNotification,
      lastError: this._lastError,
      lastSlackEtherBalanceNotification: this._lastSlackEtherBalanceNotification,
      lastSlackTokenBalanceNotification: this._lastSlackTokenBalanceNotification
    }
  }

  _notifyLackOfEther (balanceOfEther) {
    const minimunAmount = MINIMUM_AMOUNT_FOR_ETHER / 1e18
    const balance = balanceOfEther.div(1e18).valueOf()

    const message = 'The bot account has ETHER balance below ' + minimunAmount

    // Log message
    logger.warn({
      msg: message,
      contextData: {
        extra: {
          balanceOfEther: balance
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
              value: balance + ' WETH',
              short: false
            }, {
              title: 'Bot account',
              value: this._botAddress,
              short: false
            }
          ],
          author_name: this.nameForLogging,
          footer: this.botInfo
        }]
      }
    })
  }

  _notifyLackOfTokens (tokenBelowMinimun) {
    // Notify which tokens are below the minimun value
    this._lastWarnNotification = new Date()
    const tokenBelowMinimunValue = tokenBelowMinimun.map(balanceInfo => {
      return Object.assign(balanceInfo, {
        amount: balanceInfo.amount.div(1e18).valueOf(),
        amountInUSD: balanceInfo.amountInUSD.valueOf()
      })
    })

    const message = `The bot account has tokens below the ${MINIMUM_AMOUNT_IN_USD_FOR_TOKENS} USD worth of value`
    const tokenNames = tokenBelowMinimun.map(balanceInfo => balanceInfo.token).join(', ')
    const fields = tokenBelowMinimunValue.map(({ token, amount, amountInUSD }) => ({
      title: token,
      value: amount + ' ' + token + ' ($' + amountInUSD + ')',
      short: false
    }))

    // Log message
    logger.warn({
      msg: message + ': ' + tokenNames,
      contextData: {
        extra: {
          tokenBelowMinimun: tokenBelowMinimunValue
        }
      },
      notify: true
    })

    // Notify to slack
    this._notifyToSlack({
      name: 'Token Balances',
      lastNotificationVariableName: '_lastSlackTokenBalanceNotification',
      message: {
        attachments: [{
          color: 'danger',
          title: message,
          text: 'The tokens below the threshold are:',
          fields: fields,
          author_name: this.nameForLogging,
          footer: this.botInfo
        }]
      }
    })
  }

  async _notifyToSlack ({ name, lastNotificationVariableName, message }) {
    if (this._botFundingSlackChannel && this._slackClient.isEnabled()) {
      const now = new Date()
      const lastNotification = this[lastNotificationVariableName]

      let nextNotification
      if (lastNotification) {
        nextNotification = new Date(
          lastNotification.getTime() +
          MINIMUN_TIME_BETWEEN_SLACK_NOTIFICATIONS
        )
      } else {
        nextNotification = now
      }
      if (nextNotification <= now) {
        logger.info('Notifying "%s" to slack', name)
        message.channel = this._botFundingSlackChannel

        this._slackClient
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
}

module.exports = BalanceCheckBot
