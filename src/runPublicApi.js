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
instanceFactory({
  // FIXME we should disable this once getAuctionsInfo is implemented outside this servie
  createReportService: true,
  config: {
    // FIXME: Fix event filtering when you don't provide a mnemonic
    //  * The event filtering depends on having a mnemonic
    //  * The API shouldn't need one, cause it only reads data (no transaction)
    //  * We temporarily add an arbitrary mnemonic, just for the API (no funding
    //   should ever go to this addresses)
    MNEMONIC: 'candy maple cake sugar pudding cream honey rich smooth crumble sweet treat'
  }
}).then(instances => {
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
    // FIXME remove once getAuctionsInfo is implemented outside this service
    reportService,

    // Events
    eventBus,
    ethereumClient,
    auctionEventWatcher,
    slackClient
  }) {
    this._config = config
    this._eventBus = eventBus
    this._ethereumClient = ethereumClient
    this._slackClient = slackClient

    // Services
    this._dxInfoService = dxInfoService
    this._dxTradeService = dxTradeService
    this._reportService = reportService

    // API
    this._cacheTimeouts = {
      short: this._config.CACHE_TIMEOUT_SHORT,
      average: this._config.CACHE_TIMEOUT_AVERAGE,
      long: this._config.CACHE_TIMEOUT_LONG
    }

    this._publicApiServer = new PublicApiServer({
      port: this._config.PUBLIC_API_PORT,
      host: this._config.PUBLIC_API_HOST,
      dxInfoService: this._dxInfoService,
      dxTradeService: this._dxTradeService,
      reportService: this._reportService,
      cacheTimeouts: this._cacheTimeouts
    })
  }

  async start () {
    const version = await this._dxInfoService.getVersion()
    await this._notifyStart(version)

    // Run Api server
    await this._publicApiServer.start()

    logger.info('Public API Server %s ready!', version)
  }

  async stop () {
    const version = await this._dxInfoService.getVersion()
    await this._notifyStop(version)

    // Stop the API Server
    if (this._publicApiServer) {
      this._publicApiServer.stop()
    }
    // Clear listerners
    if (this._eventBus) {
      this._eventBus.clearAllListeners()
    }
    logger.info('Public API Server is ready to shut down')
  }

  async _notifyStart (version) {
    const message = `Starting Public API Server v${version} in \
"${this._config.ENVIRONMENT}" environment`

    // Display some basic info
    logger.info(message)

    if (this._slackClient.isEnabled()) {
      await this._slackClient.postMessage({
        channel: this._config.SLACK_CHANNEL_OPERATIONS,
        text: message
      }).catch(error => {
        logger.error({
          msg: 'Error notifing API start to Slack: ' + error.toString(),
          error
        })
      })
    }
  }

  async _notifyStop (version) {
    const message = `Stopping Public API Server v${version} in \
"${this._config.ENVIRONMENT}" environment`

    // Display some basic info
    logger.info(message)

    if (this._slackClient.isEnabled()) {
      await this._slackClient.postMessage({
        channel: this._config.SLACK_CHANNEL_OPERATIONS,
        text: message
      }).catch(error => {
        logger.error({
          msg: 'Error notifing API stop to Slack: ' + error.toString(),
          error
        })
      })
    }
  }
}

function handleError (error) {
  process.exitCode = 1
  logger.error({
    msg: 'Error booting the application: ' + error.toString(),
    error
  })
}
