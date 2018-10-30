const loggerNamespace = 'dx-service:tasks:claimFunds'
const Logger = require('../helpers/Logger')
const logger = new Logger(loggerNamespace)
const assert = require('assert')

// Helpers
const gracefullShutdown = require('../helpers/gracefullShutdown')
const instanceFactory = require('../helpers/instanceFactory')
const getBotAddress = require('../helpers/getBotAddress')

// Env
logger.info('Claiming funds')

// Run app
instanceFactory()
  .then(claimFunds)
  .then(() => gracefullShutdown.shutDown())
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
    config.SELL_LIQUIDITY_BOTS
  )

  // List markets grouped by account
  const marketsByAccount = buyAndSellBotsConfig.reduce((accountMarkets, botConfig) => {
    return _getAccountMarkets(accountMarkets, botConfig)
  }, {})

  const accountKeys = Object.keys(marketsByAccount)

  const claimingPromises = accountKeys.map(accountKey => {
    return _doClaim({
      // data
      accountIndex: accountKey,
      markets: marketsByAccount[accountKey].markets,
      name: marketsByAccount[accountKey].name,
      // service and config
      ethereumClient,
      dxTradeService,
      config
    })
  })

  return Promise.all(claimingPromises)
}

const _doClaim = async ({ accountIndex, markets, name, ethereumClient, dxTradeService, config }) => {
  // Execute the claim
  const botAddress = await getBotAddress(ethereumClient, accountIndex)
  assert(botAddress, 'The bot address was not configured. Define the MNEMONIC environment var')

  logger.info('Claiming for address %s affected bots: %s', botAddress, name)

  const claimResult = await dxTradeService.claimAll({
    tokenPairs: markets,
    address: botAddress,
    lastNAuctions: config.AUTO_CLAIM_AUCTIONS
  })

  logger.info('Claimed for address %s. Result: %o', botAddress, claimResult)

  return claimResult
}

// List markets grouped by account
function _getAccountMarkets (accountMarkets, { accountIndex, markets, name }) {
  // First time we see this account
  if (!accountMarkets.hasOwnProperty(accountIndex)) {
    accountMarkets[accountIndex] = {
      name: name,
      markets: []
    }
  } else {
    accountMarkets[accountIndex].name += ', ' + name
  }

  function _compareTokenPair (tokenPair, {sellToken, buyToken}) {
    return tokenPair.sellToken === sellToken && tokenPair.buyToken === buyToken
  }

  markets.forEach(({ tokenA, tokenB }) => {
    // Check if market already used with this account in another bot
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

function handleError (error) {
  process.exitCode = 1
  logger.error({
    msg: 'Error booting the application: ' + error.toString(),
    error
  })
}
