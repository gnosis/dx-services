const loggerNamespace = 'dx-service:bots:DepositBot'
const Bot = require('./Bot')
const Logger = require('../helpers/Logger')
const getVersion = require('../helpers/getVersion')

const getBotAddress = require('../helpers/getBotAddress')

const numberUtil = require('../../src/helpers/numberUtil')

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
    slackClient,
    botTransactionsSlackChannel,
    tokensByAccount,
    notifications,
    checkTimeInMilliseconds = DEPOSIT_PERIODIC_CHECK_MILLISECONDS
  }) {
    super(name)
    this._dxInfoService = dxInfoService
    this._dxTradeService = dxTradeService
    this._ethereumClient = ethereumClient
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

    // Check if the bots need to deposit periodically
    this._depositFunds()
    setInterval(() => {
      return this._depositFunds()
    }, this._checkTimeInMilliseconds)
  }

  async _doStop () {
    logger.debug({ msg: 'Bot stopped: ' + this.name })
  }

  async _depositFunds () {
    this._lastCheck = new Date()
    let botHasDepositedFunds
    try {
      logger.debug('Tokens by account: %O', this._tokensByAccount)
      const accountKeys = Object.keys(this._tokensByAccount)

      const accountAddressesPromises = accountKeys.map(accountKey => {
        return getBotAddress(this._ethereumClient, accountKey)
      })

      const accountAddresses = await Promise.all(accountAddressesPromises)
      logger.debug('Account addresses: %O', accountAddresses)

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

      const balancesOfEther = await Promise.all(balanceOfEtherPromises)
      logger.debug('Balances of ether: %O', balancesOfEther)

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
      const balancesOfEtherPromises = balancesOfEther.map((balance, index) => {
        let weiReserveAmount = numberUtil.toWei(ETHER_RESERVE_AMOUNT)
        if (balance > weiReserveAmount) {
          logger.debug('I have to deposit %d ether for account %s', balance - weiReserveAmount, accountAddresses[index])
          const amount = balance.sub(weiReserveAmount)
          return this._dxTradeService.deposit({
            token: 'WETH',
            amount,
            accountAddress: accountAddresses[index]
          }).then(result => {
            // Notify ether deposited
            this._notifyDepositedTokens(amount, 'ETH', accountAddresses[index])
          }).catch(error => {
            this._handleError('WETH', accountAddresses[index], error)
          })
        } else {
          logger.debug('No Ether tokens to deposit for account: %s', accountAddresses[index])
        }
      })

      // Check if there is ERC20 tokens balance not deposited in any account
      const balancesOfTokensPromises = balancesOfTokens.reduce((balancesPromises, accountBalances, index) => {
        // Check if there are tokens below the minimun amount
        const accountBalancesPromises = accountBalances.map(({ token, amount }) => {
          if (amount > 0) {
            logger.debug('I have to deposit %s for account %s', token, accountAddresses[index])
            return this._dxTradeService.deposit({
              token,
              amount,
              accountAddress: accountAddresses[index]
            }).then(result => {
              // Notify tokens deposited
              this._notifyDepositedTokens(amount, token, accountAddresses[index])
            }).catch(error => {
              this._handleError(token, accountAddresses[index], error)
            })
          } else {
            logger.debug('No %s tokens to deposit for account: %s', token, accountAddresses[index])
          }
        })

        return balancesPromises.concat(accountBalancesPromises)
      }, [])

      await Promise.all(balancesOfEtherPromises.concat(balancesOfTokensPromises))
      logger.debug('Finished task depositbot')
      botHasDepositedFunds = balancesOfEtherPromises.length > 0 ||
        balancesOfTokensPromises.length > 0
    } catch (error) {
      this.lastError = new Date()
      botHasDepositedFunds = false
      logger.error({
        msg: 'There was an error trying to automaticaly deposit %s',
        params: [ error ],
        error
      })
    }

    return botHasDepositedFunds
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
    if (this._botTransactionsSlackChannel && this._slackClient.isEnabled()) {
      this._notifyDepositedTokensSlack({
        channel: '',
        account,
        depositedTokensString
      })
    }
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
