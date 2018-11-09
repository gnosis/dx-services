const loggerNamespace = 'dx-service:bots:DepositBot'
const Bot = require('./Bot')
const Logger = require('../helpers/Logger')
const getVersion = require('../helpers/getVersion')

const getBotAddress = require('../helpers/getBotAddress')

const numberUtil = require('../../src/helpers/numberUtil')
const dateUtil = require('../../src/helpers/dateUtil')
const BOT_TYPE = 'DepositBot'

const logger = new Logger(loggerNamespace)
// const auctionLogger = new AuctionLogger(loggerNamespace)

const ETHER_RESERVE_AMOUNT =
  process.env.ETHER_RESERVE_AMOUNT || 1.5
const DEPOSIT_PERIODIC_CHECK_MILLISECONDS =
  process.env.DEPOSIT_BOT_CHECK_TIME_MS || (5 * 60 * 1000) // 5 min

class DepositBot extends Bot {
  constructor ({
    name,
    dxInfoService,
    dxTradeService,
    ethereumClient,
    slackRepo,
    botTransactionsSlackChannel,
    tokensByAccount,
    notifications,
    checkTimeInMilliseconds = DEPOSIT_PERIODIC_CHECK_MILLISECONDS,
    inactivityPeriods = []
  }) {
    super(name, BOT_TYPE)
    this._dxInfoService = dxInfoService
    this._dxTradeService = dxTradeService
    this._ethereumClient = ethereumClient
    this._slackRepo = slackRepo
    this._botTransactionsSlackChannel = botTransactionsSlackChannel

    this._tokensByAccount = tokensByAccount

    this._notifications = notifications
    this._checkTimeInMilliseconds = checkTimeInMilliseconds

    this._inactivityPeriods = inactivityPeriods

    this._lastCheck = null
    this._lastDeposit = null
    this._lastError = null

    this._botInfo = 'DepositBot - v' + getVersion()
  }

  async init () {
    logger.debug('Init Deposit Bot: ' + this.name)
  }

  async _doStart () {
    logger.debug({ msg: 'Initialized bot: ' + this.name })

    // Check if the bots need to deposit periodically
    this._depositFunds()
    setInterval(() => {
      return this._depositFunds()
    }, this._checkTimeInMilliseconds)
  }

  async _doStop () {
    logger.debug({ msg: 'Bot stopped: ' + this.name })
  }

  async _getTokenBalances (accountKeys, accountAddresses) {
    // Prepare balances promises
    const balanceOfEtherPromises = accountAddresses.map(account => {
      // Get ETH balance
      return this._dxInfoService.getBalanceOfEther({ account })
    })

    const balanceOfTokensPromises = accountAddresses.map((account, index) => {
      // Get balance of ERC20 tokens
      return this._dxInfoService.getAccountBalancesForTokensNotDeposited({
        tokens: this._tokensByAccount[accountKeys[index]].tokens,
        account
      })
    })

    // Execute balances promises
    const balancesOfEther = await Promise.all(balanceOfEtherPromises)
    logger.debug('Balances of ether: %O', balancesOfEther)
    const balancesOfTokens = await Promise.all(balanceOfTokensPromises)
    logger.debug('Balances of tokens: %O', balancesOfTokens)

    return [ balancesOfEther, balancesOfTokens ]
  }

  async _depositFunds () {
    this._lastCheck = new Date()
    // Check if we are in an inactive period
    const isWaitingTime = this._inactivityPeriods.some(({ from, to }) => {
      return dateUtil.isNowBetweenPeriod(from, to, 'HH:mm')
    })

    if (isWaitingTime) {
      // We stop deposit funds execution
      logger.debug('We are at an inactive time lapse, claim your funds now')
    } else {
      return this._doDepositFunds()
    }
  }

  async _doDepositFunds () {
    try {
      logger.debug('Tokens by account: %O', this._tokensByAccount)
      const accountKeys = Object.keys(this._tokensByAccount)

      // Get account addresses
      const accountAddressesPromises = accountKeys.map(accountKey => {
        return getBotAddress(this._ethereumClient, accountKey)
      })
      const accountAddresses = await Promise.all(accountAddressesPromises)
      logger.debug('Account addresses: %O', accountAddresses)

      const [ balancesOfEther, balancesOfTokens ] = await this._getTokenBalances(
        accountKeys, accountAddresses)

      // Deposit ETH
      //  If any account has Ether over the RESERVE_AMOUNT, we deposit it
      const depositEtherPromises = balancesOfEther.map((balance, index) => {
        return this._depositTokensIfBalance({
          token: 'ETH',
          amount: balance,
          accountAddress: accountAddresses[index],
          threshold: ETHER_RESERVE_AMOUNT
        })
      }, [])

      // Deposit TOKENS
      //  If any account, has a token balance, de deposit
      const depositTokensPromises = balancesOfTokens.map((accountBalances, index) => {
        const accountAddress = accountAddresses[index]
        const depositTokenForAccountPromises = accountBalances.map(({ amount, token }) => {
          return this._depositTokensIfBalance({
            token,
            amount,
            accountAddress,
            threshold: 0
          })
        })

        return Promise.all(depositTokenForAccountPromises)
      })

      const depositedAmounts = await Promise.all(depositEtherPromises.concat(depositTokensPromises))
      return depositedAmounts.some(amount => amount !== 0)
    } catch (error) {
      this.lastError = new Date()
      logger.error({
        msg: 'There was an error trying to automaticaly deposit %s',
        params: [ error ],
        error
      })
    }
  }

  // Function to check and handle token depositing
  async _depositTokensIfBalance ({
    token,
    amount,
    accountAddress,
    threshold
  }) {
    const weiReserveAmount = numberUtil.toWei(threshold)
    logger.debug('Wei reserve amount for token %s: %O', token, weiReserveAmount)
    if (amount.greaterThan(weiReserveAmount)) {
      // We have tokens to deposit
      const amountToDeposit = amount.minus(weiReserveAmount)
      const tokenToDeposit = token === 'ETH' ? 'WETH' : token
      logger.info('I have to deposit %d %s for account %s',
        numberUtil.fromWei(amountToDeposit),
        token,
        accountAddress
      )

      return this._dxTradeService
        .deposit({
          token: tokenToDeposit,
          amount: amountToDeposit,
          accountAddress
        })
        .then(result => {
          // Notify deposited token
          this._notifyDepositedTokens(amount, token, accountAddress)
          return amount
        })
        .catch(error => {
          this._handleError(token, accountAddress, error)
          return 0
        })
    } else {
      logger.debug('No %s tokens to deposit for account: %s', token, accountAddress)
      return 0
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
    if (this._botTransactionsSlackChannel && this._slackRepo.isEnabled()) {
      this._notifyDepositedTokensSlack({
        channel: '',
        account,
        depositedTokensString
      })
    }
  }

  _notifyDepositedTokensSlack ({ channel, account, depositedTokensString }) {
    this._slackRepo
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

  _handleError (token, account, error) {
    // Log message
    logger.error({
      msg: 'There was an error depositing %s with the account %s',
      params: [token, account],
      error
    })
  }

  async getInfo () {
    return {
      lastCheck: this._lastCheck,
      lastDeposit: this._lastDeposit,
      lastError: this._lastError,
      notifications: this._notifications,
      defaultSlackChannel: this._botTransactionsSlackChannel,
      checkTimeInMilliseconds: this._checkTimeInMilliseconds
    }
  }
}

module.exports = DepositBot
