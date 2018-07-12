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

  const _doClaim = async ({ accountIndex, markets }) => {
    const botAddress = await getBotAddress(ethereumClient, accountIndex)
    assert(botAddress, 'The bot address was not configured. Define the MNEMONIC environment var')

    const tokenPairs = markets.reduce((pairs, { tokenA, tokenB }) => {
      pairs.push(
        { sellToken: tokenA, buyToken: tokenB },
        { sellToken: tokenB, buyToken: tokenA })
      return pairs
    }, [])

    return dxTradeService.claimAll({
      tokenPairs,
      address: botAddress,
      lastNAuctions: config.AUTO_CLAIM_AUCTIONS
    })
  }

  return buyAndSellBotsConfig.map(botConfig => {
    _doClaim(botConfig)
  })
}

function handleError (error) {
  process.exitCode = 1
  logger.error({
    msg: 'Error booting the application: ' + error.toString(),
    error
  })
}
