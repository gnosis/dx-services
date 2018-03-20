const loggerNamespace = 'dx-service:bots:BalanceCheckBot'
const Bot = require('./Bot')
const Logger = require('../helpers/Logger')
const logger = new Logger(loggerNamespace)

const MINIMUM_AMOUNT_IN_USD_FOR_TOKENS = 2500 // $2500
const MINIMUM_AMOUNT_FOR_ETHER = 0.1 * 1e18 // 0.1 ETH
const PERIODIC_CHECK_MILLISECONDS = 15 * 60 * 1000 // 15 min

class BalanceCheckBot extends Bot {
  constructor ({ name, eventBus, liquidityService, dxInfoService, botAddress, markets }) {
    super(name)
    this._eventBus = eventBus
    this._liquidityService = liquidityService
    this._dxInfoService = dxInfoService

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
      const [ balanceOfEther, balancesOfTokens ] = await Promise.all([
        // Get ETH balance
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
        logger.warn({
          msg: 'The bot account has ETHER balance below: %s',
          params: [
            MINIMUM_AMOUNT_FOR_ETHER / 1.e18
          ],
          contextData: {
            extra: {
              balanceOfEther: balanceOfEther.valueOf()
            }
          },
          notify: true
        })
      }

      // Check if there are tokens below the minimun amount
      const tokenBelowMinimun = balancesOfTokens.filter(balanceInfo => {
        return balanceInfo.anmountInUSD.lessThan(MINIMUM_AMOUNT_IN_USD_FOR_TOKENS)
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
            MINIMUM_AMOUNT_IN_USD_FOR_TOKENS,
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
      lastError: this._lastError
    }
  }
}

module.exports = BalanceCheckBot
