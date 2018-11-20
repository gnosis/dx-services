const loggerNamespace = 'dx-service:dxPublicApi'
const Logger = require('./helpers/Logger')
const logger = new Logger(loggerNamespace)

// Helpers
const gracefullShutdown = require('./helpers/gracefullShutdown')

const ApiRunner = require('./ApiRunner')

function handleError (error) {
  process.exitCode = 1
  logger.error({
    msg: 'Error booting the application: ' + error.toString(),
    error
  })
}

async function start ({ config }) {
  const apiRunner = new ApiRunner({ config })

  // Let the app stop gracefully
  gracefullShutdown.onShutdown(() => {
    return apiRunner.stop()
  })

  // Start the app
  return apiRunner.start()
}

start({
  config: {
    // FIXME: Fix event filtering when you don't provide a mnemonic
    //  * The event filtering depends on having a mnemonic
    //  * The API shouldn't need one, cause it only reads data (no transaction)
    //  * We temporarily add an arbitrary mnemonic, just for the API (no funding
    //   should ever go to this addresses)
    MNEMONIC: 'candy maple cake sugar pudding cream honey rich smooth crumble sweet treat'
  }
}).catch(error => {
  // Handle boot errors
  handleError(error)

  // Shutdown app
  return gracefullShutdown.shutDown()
})
