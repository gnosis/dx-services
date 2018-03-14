const loggerNamespace = 'dx-service:main'
const Logger = require('./helpers/Logger')
const logger = new Logger(loggerNamespace)

// Helpers
const gracefullShutdown = require('./helpers/gracefullShutdown')
const instanceFactory = require('./helpers/instanceFactory')

// Env
const environment = process.env.NODE_ENV
const isLocal = environment === 'local'
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
    botService,
    apiService,
    // Events
    eventBus,
    ethereumClient,
    auctionEventWatcher
  }) {
    this._config = config
    this._botService = botService
    this._apiService = apiService
    this._eventBus = eventBus
    this._auctionEventWatcher = auctionEventWatcher
    this._ethereumClient = ethereumClient

    this._bots = null
    this._dxApiServer = null

    // Initialize the bots and API
    this.isReadyPromise = this
      ._getBotAddress(ethereumClient)
      .then(botAddress => this._createBotsAndApi(botAddress))
  }

  async start () {
    await this.isReadyPromise

    // Display some basic info
    const about = await this._botService.getAbout()
    logger.info({
      msg: 'Loading app in %s environment with %o ...',
      params: [ this._config.ENVIRONMENT, about ]
    })
    
    // Run all the bots
    await Promise.all(
      this._bots.map(bot => bot.start())
    )
    logger.info({ msg: 'All bots are ready' })

    // Run Api server
    await this._dxApiServer.start()

    // Watch auction events
    await this._auctionEventWatcher.start()
    logger.info({ msg: 'App ready!' })
  }

  async stop () {
    logger.info({ msg: 'Shut down App' })

    // Stop the API Server
    if (this._dxApiServer) {
      this._dxApiServer.stop()
    }

    // Stop the bots
    if (this._bots) {
      logger.info({ msg: 'Stopping the bots' })
      await Promise.all(
        this._bots.map(async bot => bot.stop())
      )
    }

    // Clear listerners
    if (this._eventBus) {
      this._eventBus.clearAllListeners()
    }
    logger.info({ msg: 'App is ready to shutDown' })
  }

  _createBotsAndApi (botAddress) {
    // Liquidity bot
    const SellLiquidityBot = require('./bots/SellLiquidityBot')
    const sellLiquidityBot = new SellLiquidityBot({
      name: 'SellLiquidityBot',
      eventBus: this._eventBus,
      botService: this._botService,
      botAddress,
      markets: this._config.MARKETS
    })

    // Initialize bot list
    this._bots = [ sellLiquidityBot ]
    this._apiService.setBots(this._bots)

    // Create server
    const DxApiServer = require('./web/DxApiServer')
    this._dxApiServer = new DxApiServer({
      port: this._config.API_PORT,
      host: this._config.API_HOST,
      apiService: this._apiService
    })
  }

  async _getBotAddress () {
    return this._ethereumClient
      .getAccounts()
      .then(accounts => {
        if (isLocal && accounts.length > 1) {
          // In LOCAL, for testing we use:
          //  * the account 0 for the owner
          //  * the account 1 for the bot
          return accounts[1]
        } else if (accounts.length > 0) {
          // In DEV,PRE and PRO we use the account 0 for the bot
          return accounts[0]
        } else {
          throw new Error("The ethereumClient doesn't have the bot account configured")
        }
      })
  }
}

function handleError (error) {
  process.exitCode = 1
  logger.error({
    msg: 'Error booting the application: ' + error.toString(),
    error
  })
}
