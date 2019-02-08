const loggerNamespace = 'dx-service:bots:SafeModuleBalanceCheckBot'
const BalanceCheckBot = require('./BalanceCheckBot')
const Logger = require('../helpers/Logger')
const logger = new Logger(loggerNamespace)
const assert = require('assert')

const BOT_TYPE = 'BalanceCheckBot'

const MINIMUM_AMOUNT_IN_USD_FOR_TOKENS = process.env.BALANCE_CHECK_THRESHOLD_USD || 5000 // $5000
const MINIMUM_AMOUNT_FOR_ETHER = (process.env.BALANCE_CHECK_THRESHOLD_ETHER || 0.4) * 1e18 // 0.4 WETH


class SafeModuleBalanceCheckBot extends BalanceCheckBot {
  constructor ({
    name,
    botAddress,
    accountIndex,
    tokens,
    notifications,
    minimumAmountForEther,
    minimumAmountInUsdForToken
  }) {
    super({
      name,
      accountIndex,
      botAddress,
      BOT_TYPE,
      minimumAmountForEther,
      minimumAmountInUsdForToken,
      notifications,
      tokens
    })

    assert(accountIndex !== undefined && accountIndex >= 0, 'AccountIndex is mandatory')
    // Set accountIndex independently from the botAddress being setted
    this._accountIndex = accountIndex
  }

  async setAddress () {
    await super.setAddress()
    const web3 = this._ethereumClient.getWeb3()
    const operatorAddress = web3.currentProvider.getHDAccount(this._accountIndex)
    assert(operatorAddress, 'Couldn\'t get the operator address, check that HDWalletSafeProvider is setted up correctly')
    this._operatorAddress = operatorAddress
  }

  async _checkBalance () {
    this._lastCheck = new Date()
    let botHasEnoughTokens
    try {
      const account = this._botAddress

      // Get ETH balance of the Safe Operator
      const balanceOfEtherPromise = this._dxInfoService.getBalanceOfEther({
        account: this._operatorAddress })

      // Get balance of ERC20 tokens
      const balanceOfTokensPromise = this._liquidityService.getBalances({
        tokens: this._tokens,
        address: account // account is the Safe
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
        this._notifyLackOfEther(balanceOfEther, this._operatorAddress, minimumAmountForEther)
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
}

module.exports = SafeModuleBalanceCheckBot
