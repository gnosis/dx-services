const loggerNamespace = 'dx-service:indexer'
const Logger = require('../helpers/Logger')
const logger = new Logger(loggerNamespace)
const config = require('../../conf')

// Helpers
const gracefullShutdown = require('../helpers/gracefullShutdown')
const getIndexerService = require('./services/IndexerService')

async function start () {
  const { ENVIRONMENT } = config
  logger.info('Indexing Events for: %s', ENVIRONMENT)
  const indexerService = await getIndexerService()
  await indexerService.indexEvents()
  logger.info('The events were indexed!')
}

start()
  .then(gracefullShutdown.shutDown)
  .catch(error => {
    // Handle boot errors
    _handleError(error)

    // Shutdown app
    return gracefullShutdown.shutDown()
  })

function _handleError (error) {
  process.exitCode = 1
  logger.error({
    msg: 'Error booting the application: ' + error.toString(),
    error
  })
}
