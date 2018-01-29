const debug = require('debug')('dx-service:helpers:gratefullShutdown')
const POSIX_SIGNALS = ['SIGINT', 'SIGTERM', 'SIGQUIT']
const listerners = []

POSIX_SIGNALS.forEach(signal => {
  process.on(signal, () => {
    function exit (returnCode) {
      debug('The app is ready to shutdown! Good bye! :)')
      process.exit(returnCode)
    }

    shutDown(signal)
      .then(() => {
        exit(0)
      })
      .catch(error => {
        console.error('Error shuttting down the app', error)
        exit(1)
      })
  })
})

function onShutdown (listener) {
  // debug('Registering a new listener')
  listerners.push(listener)
}

async function shutDown (signal) {
  if (signal) {
    debug("I've gotten a %o signal! Closing gracefully...", signal)
  }

  // Wait for all shutdow listeners
  await Promise.all(
    listerners.map(listener => {
      return listener()
    })
  )
}

module.exports = {
  shutDown,
  onShutdown
}
