const loggerNamespace = 'dx-service:tasks:claimFunds'
const Logger = require('../helpers/Logger')
const logger = new Logger(loggerNamespace)
const assert = require('assert')

// Helpers
const gracefullShutdown = require('../helpers/gracefullShutdown')
const instanceFactory = require('../helpers/instanceFactory')
const getBotAddress = require('../helpers/getBotAddress')

// Env
const environment = process.env.NODE_ENV

logger.info('Claiming funds for %s', environment)

// Run app
instanceFactory()
  .then(claimFunds)
  .catch(error => {
    // Handle boot errors
    handleError(error)

    // Shutdown app
    return gracefullShutdown.shutDown()
  })

async function claimFunds ({
  config, dxTradeService, ethereumClient
}) {
  const buyAndSellBotsConfig = [].concat(
    config.BUY_LIQUIDITY_BOTS,
    config.SELL_LIQUIDITY_BOTS)

  function _getAccountMarkets (accountMarkets, { accountIndex, markets, name }) {
    if (!accountMarkets.hasOwnProperty(accountIndex)) {
      accountMarkets[accountIndex] = {
        name: '',
        markets: []
      }
    }

    const SEPARATOR = accountMarkets[accountIndex].name.length > 0
      ? ', '
      : ''
    accountMarkets[accountIndex].name += SEPARATOR + name

    function _compareTokenPair (tokenPair, {sellToken, buyToken}) {
      return tokenPair.sellToken === sellToken && tokenPair.buyToken === buyToken
    }

    markets.forEach(({ tokenA, tokenB }) => {
      if (accountMarkets[accountIndex].markets.findIndex(market =>
        _compareTokenPair(market, { sellToken: tokenA, buyToken: tokenB })) === -1) {
        accountMarkets[accountIndex].markets.push({ sellToken: tokenA, buyToken: tokenB })
      }
      if (accountMarkets[accountIndex].markets.findIndex(market =>
        _compareTokenPair(market, { sellToken: tokenB, buyToken: tokenA })) === -1) {
        accountMarkets[accountIndex].markets.push({ sellToken: tokenB, buyToken: tokenA })
      }
    })
    return accountMarkets
  }

  const marketsByAccount = buyAndSellBotsConfig.reduce((accountMarkets, botConfig) => {
    return _getAccountMarkets(accountMarkets, botConfig)
  }, {})

  const accountKeys = Object.keys(marketsByAccount)

  const _doClaim = async ({ accountIndex, markets, name }) => {
    const botAddress = await getBotAddress(ethereumClient, accountIndex)
    assert(botAddress, 'The bot address was not configured. Define the MNEMONIC environment var')

    logger.info('Claiming for address %s affected bots: %s', botAddress, name)

    const claimResult = await dxTradeService.claimAll({
      tokenPairs: markets,
      address: botAddress,
      lastNAuctions: config.AUTO_CLAIM_AUCTIONS
    })

    return claimResult
  }

  return accountKeys.forEach(accountKey => {
    _doClaim({
      accountIndex: accountKey,
      markets: marketsByAccount[accountKey].markets,
      name: marketsByAccount[accountKey].name})
  })
}

function handleError (error) {
  process.exitCode = 1
  logger.error({
    msg: 'Error booting the application: ' + error.toString(),
    error
  })
}
