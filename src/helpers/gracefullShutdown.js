const loggerNamespace = 'dx-service:helpers:gratefullShutdown'
const Logger = require('../helpers/Logger')
const logger = new Logger(loggerNamespace)
const POSIX_SIGNALS = ['SIGINT', 'SIGTERM', 'SIGQUIT']
const listerners = []
let shuttedDown = false

POSIX_SIGNALS.forEach(signal => {
  process.on(signal, () => {
    _doShutDown(`I've gotten a ${signal} signal`)
  })
})

process.on('uncaughtException', error => {
  logger.error({
    msg: 'Uncought exception: ' + error.toString(),
    error
  })

  // TODO: Decide if we want to shutdown the app here or not
  // _doShutDown(`There was a glonal unhandled exception`)
})

process.on('unhandledRejection', error => {
  logger.error({
    msg: 'Uncought promise rejection: ' + error.toString(),
    error
  })

  // TODO: Decide if we want to shutdown the app here or not
  // _doShutDown(`There was a glonal uncought global exception`)
})

function onShutdown (listener) {
  // debug('Registering a new listener')
  listerners.push(listener)
}

async function shutDown (reason) {
  if (!shuttedDown) {
    shuttedDown = true
    let reasonPrefix = reason ? reason + ': ' : ''
    logger.info(reasonPrefix + 'Closing gracefully...')

    // Wait for all shutdow listeners
    await Promise.all(
      listerners.map(listener => {
        return listener()
      })
    )
  }
}

function _doShutDown (reason) {
  function _doExit (returnCode) {
    logger.info('The app is ready to shutdown! Good bye! :)')
    process.exit(returnCode)
  }

  shutDown(reason)
    .then(() => {
      _doExit(0)
    })
    .catch(error => {
      logger.error({
        msg: 'Error shuttting down the app: ' + error.toString(),
        error
      })
      _doExit(2)
    })
}

module.exports = {
  shutDown,
  onShutdown
}
