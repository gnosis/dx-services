const loggerNamespace = 'dx-service:dxPublicApi'
const Logger = require('./helpers/Logger')
const logger = new Logger(loggerNamespace)

// Public Api
const PublicApiServer = require('./web/publicApi/PublicApiServer')

// Helpers
const gracefullShutdown = require('./helpers/gracefullShutdown')
const instanceFactory = require('./helpers/instanceFactory')
let app

// Run app
instanceFactory({})
  .then(instances => {
    // Create the app
    app = new App(instances)

    // Let the app stop gracefully
    gracefullShutdown.onShutdown(() => {
      return app.stop()
    })

    // Start the app
    return app.start()
  })
  .catch(error => {
    // Handle boot errors
    handleError(error)

    // Shutdown app
    return gracefullShutdown.shutDown()
  })

class App {
  constructor ({
    config,
    // Services
    liquidityService,
    dxInfoService,
    dxTradeService,

    // Events
    eventBus,
    ethereumClient,
    auctionEventWatcher
  }) {
    this._config = config
    this._eventBus = eventBus
    this._ethereumClient = ethereumClient

    // Services
    this._dxInfoService = dxInfoService
    this._dxTradeService = dxTradeService
    
    // API
    this._publicApiServer = new PublicApiServer({
      port: this._config.PUBLIC_API_PORT,
      host: this._config.PUBLIC_API_HOST,
      dxInfoService: this._dxInfoService,
      dxTradeService: this._dxTradeService
    })
  }

  async start () {
    const version = await this._dxInfoService.getVersion()

    // Display some basic info
    logger.info({
      msg: 'Loading Public API Server v%s in "%s" environment...',
      params: [ version, this._config.ENVIRONMENT ]
    })

    // Run Api server
    await this._publicApiServer.start()

    logger.info('Public API Server %s ready!', version)
  }

  async stop () {
    logger.info({ msg: 'Shut down Public API Server' })

    // Stop the API Server
    if (this._publicApiServer) {
      this._publicApiServer.stop()
    }
    // Clear listerners
    if (this._eventBus) {
      this._eventBus.clearAllListeners()
    }
    logger.info({ msg: 'Public API Server is ready to shut down' })
  }
}

function handleError (error) {
  process.exitCode = 1
  logger.error({
    msg: 'Error booting the application: ' + error.toString(),
    error
  })
}
