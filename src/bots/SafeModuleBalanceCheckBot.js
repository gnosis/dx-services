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
    super._checkBalance({
      // Safe account
      accountForEther: this._operatorAddress,
      // Operator account
      accountForTokens: this._botAddress
    })
  }
}

module.exports = SafeModuleBalanceCheckBot
