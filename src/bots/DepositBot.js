const loggerNamespace = 'dx-service:bots:DepositBot'
const AuctionLogger = require('../helpers/AuctionLogger')
const Bot = require('./Bot')
const Logger = require('../helpers/Logger')
const getVersion = require('../helpers/getVersion')

const getBotAddress = require('../helpers/getBotAddress')

const numberUtil = require('../../src/helpers/numberUtil')

const logger = new Logger(loggerNamespace)
const auctionLogger = new AuctionLogger(loggerNamespace)
const events = require('../helpers/events')

const ETHER_RESERVE_AMOUNT =
  process.env.ETHER_RESERVE_AMOUNT || 1.5
const DEPOSIT_PERIODIC_CHECK_MILLISECONDS =
  process.env.DEPOSIT_BOT_CHECK_TIME_MS || (5 * 60 * 1000) // 5 min

class DepositBot extends Bot {
  constructor ({
    name,
    eventBus,
    dxInfoService,
    dxTradeService,
    liquidityService,
    ethereumClient,
    botAddress,
    markets,
    slackClient,
    botTransactionsSlackChannel,
    tokensByAccount,
    notifications,
    checkTimeInMilliseconds = DEPOSIT_PERIODIC_CHECK_MILLISECONDS
  }) {
    super(name)
    this._eventBus = eventBus
    this._dxInfoService = dxInfoService
    this._dxTradeService = dxTradeService
    // this._liquidityService = liquidityService
    this._ethereumClient = ethereumClient
    // this._botAddress = botAddress
    // this._markets = markets
    this._slackClient = slackClient
    this._botTransactionsSlackChannel = botTransactionsSlackChannel

    this._tokensByAccount = tokensByAccount

    this._notifications = notifications
    this._checkTimeInMilliseconds = checkTimeInMilliseconds

    this._lastCheck = null
    this._lastDeposit = null
    this._lastError = null

    this._botInfo = 'DepositBot - v' + getVersion()
  }

  async _doStart () {
    logger.debug({ msg: 'Initialized bot: ' + this.name })

    this._depositFunds()

    // Backup strategy: From time to time, we ensure the liquidity
    // Used only in case events fail to notify the bot
    setInterval(() => {
      return this._depositFunds()
    }, this._checkTimeInMilliseconds)
  }

  async _doStop () {
    logger.debug({ msg: 'Bot stopped: ' + this.name })
  }

  async _depositFunds () {
    this._lastCheck = new Date()
    try {
      logger.debug('%O', this._tokensByAccount)
      const accountKeys = Object.keys(this._tokensByAccount)

      const accountAddressesPromises = accountKeys.map(accountKey => {
        return getBotAddress(this._ethereumClient, accountKey)
      })

      const accountAddresses = await Promise.all(accountAddressesPromises)

      const balanceOfEtherPromises = accountAddresses.map(account => {
        // Get ETH balance
        return this._dxInfoService.getBalanceOfEther({ account })
      })
      logger.debug('%O', accountAddresses)

      const balanceOfTokensPromises = accountAddresses.map((account, index) => {
        // Get balance of ERC20 tokens
        return this._dxInfoService.getAccountBalancesForTokensNotDeposited({
          tokens: this._tokensByAccount[accountKeys[index]].tokens,
          account
        })
      })

      const balancesOfEther = await Promise.all(balanceOfEtherPromises)
      logger.debug('%O', balancesOfEther)

      const balancesOfTokens = await Promise.all(balanceOfTokensPromises)
      logger.debug('Balances of tokens: %O', balancesOfTokens)

      const balancesOfTokensWithAddress = accountAddresses.map((account, index) => {
        return {
          account,
          name: this._tokensByAccount[accountKeys[index]].name,
          balancesInfo: balancesOfTokens[index]
        }
      })
      logger.debug('%O', balancesOfTokensWithAddress)

      // Check if the account has ETHER over the reserve amount
      balancesOfEther.forEach((balance, index) => {
        let weiReserveAmount = numberUtil.toWei(ETHER_RESERVE_AMOUNT)
        if (balance > weiReserveAmount) {
          logger.debug('I have to deposit %d ether for account %s', balance - weiReserveAmount, accountAddresses[index])
          const amount = balance.sub(weiReserveAmount)
          this._dxTradeService.deposit({
            token: 'WETH',
            amount,
            accountAddress: accountAddresses[index]
          })
          // this._lastWarnNotification = new Date()
          // Notify ether deposited
          this._notifyDepositedTokens(amount, 'ETH', accountAddresses[index])
        } else {
          logger.debug('No Ether tokens to deposit for account: %s', accountAddresses[index])
        }
      })

      // Check if there is ERC20 tokens balance not deposited in any account
      balancesOfTokens.forEach((accountBalances, index) => {
        // Check if there are tokens below the minimun amount
        accountBalances.forEach(({ token, amount }) => {
          if (amount > 0) {
            logger.debug('I have to deposit %s for account %s', token, accountAddresses[index])
            this._dxTradeService.deposit({
              token,
              amount,
              accountAddress: accountAddresses[index]
            })
            // Notify tokens deposited
            this._notifyDepositedTokens(amount, token, accountAddresses[index])
          } else {
            logger.debug('No %s tokens to deposit for account: %s', token, accountAddresses[index])
          }
        })
      })
    } catch (error) {
      this.lastError = new Date()
      // botHasEnoughTokens = false
      logger.error({
        msg: 'There was an error if a deposit is needed %s',
        params: [ error ],
        error
      })
    }
  }

  _notifyDepositedTokens (amount, token, account) {
    const balance = amount.div(1e18).valueOf()
    const depositedTokensString = balance + ' ' + token

    const message = 'The bot deposited ' + depositedTokensString + ' into the DutchX'

    // Log message
    logger.info({
      msg: message,
      contextData: {
        extra: {
          balanceOfTokens: balance,
          account
        }
      },
      notify: true
    })

    // Notify to slack
    this._notifyDepositedTokensSlack({
      channel: '',
      account,
      depositedTokensString
    })
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
    const soldTokensString = amountInTokens + ' ' + sellToken

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

    this._notifications.forEach(({ type, channel }) => {
      switch (type) {
        case 'slack':
          // Notify to slack
          if (this._slackClient.isEnabled()) {
            this._notifySoldTokensSlack({
              channel,
              soldTokensString,
              sellToken,
              buyToken,
              auctionIndex,
              amountInUSD
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

  _notifyDepositedTokensSlack ({ channel, account, depositedTokensString }) {
    this._slackClient
      .postMessage({
        channel: channel || this._botTransactionsSlackChannel,
        attachments: [
          {
            color: 'good',
            title: 'The bot has deposited ' + depositedTokensString,
            text: 'The bot has deposited tokens into the DutchX.',
            fields: [
              {
                title: 'Bot name',
                value: this.name,
                short: false
              }, {
                title: 'Bot account',
                value: account,
                short: false
              }, {
                title: 'Deposited tokens',
                value: depositedTokensString,
                short: false
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
      // botAddress: this._botAddress,
      lastCheck: this._lastCheck,
      lastDeposit: this._lastDeposit,
      lastError: this._lastError,
      notifications: this._notifications,
      defaultSlackChannel: this._botTransactionsSlackChannel,
      checkTimeInMilliseconds: this._checkTimeInMilliseconds// ,
      // markets: this._markets
    }
  }
}

module.exports = DepositBot
