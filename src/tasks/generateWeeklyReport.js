const loggerNamespace = 'dx-service:tasks:generateWeeklyReport'
const Logger = require('../helpers/Logger')
const logger = new Logger(loggerNamespace)

// Helpers
const gracefullShutdown = require('../helpers/gracefullShutdown')
const instanceFactory = require('../helpers/instanceFactory')

// Env
const environment = process.env.NODE_ENV

logger.info('Generate Weekly report for %s', environment)

// Run app
instanceFactory({})
  .then(instances => {
    logger.info('Generate Weekly report...')
    logger.info('Done')
  })
  .catch(error => {
    // Handle boot errors
    handleError(error)

    // Shutdown app
    return gracefullShutdown.shutDown()
  })

function handleError (error) {
  process.exitCode = 1
  logger.error({
    msg: 'Error booting the application: ' + error.toString(),
    error
  })
}
