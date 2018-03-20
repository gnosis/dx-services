const loggerNamespace = 'dx-service:bots:BalanceCheckBot'
const Bot = require('./Bot')
const Logger = require('../helpers/Logger')
const logger = new Logger(loggerNamespace)

const MINIMUM_AMOUNT_IN_USD = 2500
const PERIODIC_CHECK_MILLISECONDS = 15 * 60 * 1000

class BalanceCheckBot extends Bot {
  constructor ({ name, eventBus, liquidityService, botAddress, markets }) {
    super(name)
    this._eventBus = eventBus
    this._liquidityService = liquidityService
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
      botHasEnoughTokens = await this._liquidityService
        .getBalances({
          tokens: this._tokens,
          address: this._botAddress
        })
        .then(balances => {
          const tokenBelowMinimun = balances.filter(balanceInfo => {
            return balanceInfo.anmountInUSD.lessThan(MINIMUM_AMOUNT_IN_USD)
          })

          if (tokenBelowMinimun.length > 0) {
            // TODO: In the future, we should try to maybe claim here, or create a claming bot

            // Notify which tokens are below the minimun value
            this._lastWarnNotification = new Date()
            const tokenBelowMinimunValue = tokenBelowMinimun.map(balanceInfo => {
              return Object.assign(balanceInfo, {
                amount: balanceInfo.amount.valueOf(),
                anmountInUSD: balanceInfo.anmountInUSD.valueOf()
              })
            })
            const tokenNames = tokenBelowMinimun.map(balanceInfo => balanceInfo.token).join(', ')
            logger.warn({
              msg: 'The bot account has tokens below the %d USD worth of value: %s',
              params: [
                MINIMUM_AMOUNT_IN_USD,
                tokenNames
              ],
              contextData: {
                extra: {
                  tokenBelowMinimun: tokenBelowMinimunValue
                }
              },
              notify: true
            })
          } else {
            logger.debug('Everything is fine')
          }

          return true
        })
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
      lastError: this._lastError
    }
  }
}

module.exports = BalanceCheckBot
