const loggerNamespace = 'dx-service:bots:BalanceCheckBot'
const Bot = require('./Bot')
const Logger = require('../helpers/Logger')
const logger = new Logger(loggerNamespace)
const formatUtil = require('../helpers/formatUtil')
const numberUtil = require('../helpers/numberUtil')

const getBotAddress = require('../helpers/getBotAddress')

const MINIMUM_AMOUNT_IN_USD_FOR_TOKENS = process.env.BALANCE_CHECK_THRESHOLD_USD || 5000 // $5000
const MINIMUM_AMOUNT_FOR_ETHER = (process.env.BALANCE_CHECK_THRESHOLD_ETHER || 0.4) * 1e18 // 0.4 WETH

const checkTimeMinutes = process.env.BALANCE_BOT_CHECK_TIME_MINUTES || 15 // 15 min
const slackThresholdMinutes = process.env.BALANCE_BOT_SLACK_THESHOLD_MINUTES || (4 * 60) // 4h
const PERIODIC_CHECK_MILLISECONDS = checkTimeMinutes * 60 * 1000
const MINIMUN_TIME_BETWEEN_SLACK_NOTIFICATIONS = slackThresholdMinutes * 60 * 1000

class BalanceCheckBot extends Bot {
  constructor ({
    name,
    eventBus,
    liquidityService,
    dxInfoService,
    ethereumClient,
    tokensByAccount,
    slackClient,
    botFundingSlackChannel
  }) {
    super(name)
    this._liquidityService = liquidityService
    this._dxInfoService = dxInfoService
    this._ethereumClient = ethereumClient
    this._slackClient = slackClient
    this._botFundingSlackChannel = botFundingSlackChannel

    this._tokensByAccount = tokensByAccount

    this._lastCheck = null
    this._lastWarnNotification = null
    this._lastError = null
    this._lastSlackEtherBalanceNotification = null
    this._lastSlackTokenBalanceNotification = null
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
      const accountKeys = Object.keys(this._tokensByAccount)

      const accountAddressesPromises = accountKeys.map(accountKey => {
        return getBotAddress(this._ethereumClient, accountKey)
      })

      const accountAddresses = await Promise.all(accountAddressesPromises)

      const balanceOfEtherPromises = accountAddresses.map(account => {
        // Get ETH balance
        return this._dxInfoService.getBalanceOfEther({ account })
      })

      const balanceOfTokensPromises = accountAddresses.map((account, index) => {
        // Get balance of ERC20 tokens
        return this._liquidityService.getBalances({
          tokens: this._tokensByAccount[accountKeys[index]].tokens,
          address: account
        })
      })

      const balancesOfEther = await Promise.all(balanceOfEtherPromises)

      const balancesOfTokens = await Promise.all(balanceOfTokensPromises)

      const balancesOfTokensWithAddress = accountAddresses.map((account, index) => {
        const tokenByAccountInfo = this._tokensByAccount[accountKeys[index]]

        return {
          account,
          name: tokenByAccountInfo.name,
          minimunAmountInUsdForToken: tokenByAccountInfo.minimunAmountInUsdForToken ||
            MINIMUM_AMOUNT_IN_USD_FOR_TOKENS,
          balancesInfo: balancesOfTokens[index]
        }
      })

      // Check if the account has ETHER below the minimum amount
      balancesOfEther.forEach((balance, index) => {
        const tokenByAccountInfo = this._tokensByAccount[accountKeys[index]]
        const minimunAmountForEther = tokenByAccountInfo.minimunAmountForEther || MINIMUM_AMOUNT_FOR_ETHER
        if (balance < minimunAmountForEther) {
          const account = accountAddresses[index]
          const name = tokenByAccountInfo.name
          this._lastWarnNotification = new Date()
          // Notify lack of ether
          this._notifyLackOfEther(balance, account, name, minimunAmountForEther)
        }
      })

      balancesOfTokensWithAddress.forEach(({ account, name, minimunAmountInUsdForToken, balancesInfo }) => {
        // Check if there are tokens below the minimun amount

        const tokenBelowMinimun = balancesInfo.filter(balanceInfo => {
          return balanceInfo.amountInUSD.lessThan(minimunAmountInUsdForToken)
        })

        if (tokenBelowMinimun.length > 0) {
          // Notify lack of tokens
          this._notifyLackOfTokens(tokenBelowMinimun, account, name, minimunAmountInUsdForToken)
        } else {
          logger.debug('Everything is fine for account: %s', account)
        }
      })

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
      tokensByAccount: this._tokensByAccount,
      botFundingSlackChannel: this._botFundingSlackChannel,
      lastCheck: this._lastCheck,
      lastWarnNotification: this._lastWarnNotification,
      lastError: this._lastError,
      lastSlackEtherBalanceNotification: this._lastSlackEtherBalanceNotification,
      lastSlackTokenBalanceNotification: this._lastSlackTokenBalanceNotification
    }
  }

  _notifyLackOfEther (balanceOfEther, account, name, minimunAmountForEther) {
    const minimunAmount = minimunAmountForEther * 1e-18
    const balance = balanceOfEther.div(1e18).valueOf()

    const message = 'The bot account has ETHER balance below ' + minimunAmount

    // Log message
    logger.warn({
      msg: message,
      contextData: {
        extra: {
          balanceOfEther: balance,
          account,
          name
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
            }, {
              title: 'Affected Bots',
              value: name,
              short: false
            }
          ],
          footer: this.botInfo
        }]
      }
    })
  }

  _notifyLackOfTokens (tokenBelowMinimun, account, name, minimunAmountInUsdForToken) {
    // Notify which tokens are below the minimun value
    this._lastWarnNotification = new Date()
    const tokenBelowMinimunValue = tokenBelowMinimun.map(balanceInfo => {
      return Object.assign(balanceInfo, {
        amount: balanceInfo.amount.div(1e18).valueOf(),
        amountInUSD: balanceInfo.amountInUSD.valueOf()
      })
    })

    const message = `The bot account has tokens below the ${minimunAmountInUsdForToken} USD worth of value`
    const tokenNames = tokenBelowMinimun.map(balanceInfo => balanceInfo.token).join(', ')
    let fields = tokenBelowMinimunValue.map(({ token, amount, amountInUSD }) => ({
      title: token,
      value: numberUtil.roundDown(amount, 4) + ' ' + token + ' ($' + amountInUSD + ')',
      short: false
    }))

    fields = [].concat({
      title: 'Bot account',
      value: account,
      short: false
    }, {
      title: 'Affected Bots',
      value: name,
      short: false
    }, fields)

    // Log message
    logger.warn({
      msg: message + ': ' + tokenNames,
      contextData: {
        extra: {
          account,
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
          fields,
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
