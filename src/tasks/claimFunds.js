const loggerNamespace = 'dx-service:tasks:claimFunds'
const Logger = require('../helpers/Logger')
const logger = new Logger(loggerNamespace)

// Helpers
const gracefullShutdown = require('../helpers/gracefullShutdown')
const instanceFactory = require('../helpers/instanceFactory')

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

function claimFunds ({
  config, dxTradeService, botAccount
}) {
  const tokenPairs = config.MARKETS.reduce((pairs, { tokenA, tokenB }) => {
    pairs.push(
      { sellToken: tokenA, buyToken: tokenB },
      { sellToken: tokenB, buyToken: tokenA })
    return pairs
  }, [])

  return dxTradeService.claimAll({
    tokenPairs,
    address: botAccount,
    lastNAuctions: 12
  })
}

function handleError (error) {
  process.exitCode = 1
  logger.error({
    msg: 'Error booting the application: ' + error.toString(),
    error
  })
}
