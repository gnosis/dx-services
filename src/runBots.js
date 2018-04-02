const loggerNamespace = 'dx-service:runBots'
const Logger = require('./helpers/Logger')
const logger = new Logger(loggerNamespace)

// Helpers
const gracefullShutdown = require('./helpers/gracefullShutdown')
const instanceFactory = require('./helpers/instanceFactory')

// Bot Api
const BotsApiServer = require('./web/bots/BotsApiServer')

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
    liquidityService,
    dxInfoService,
    dxTradeService,
    botsService,

    // Events
    eventBus,
    ethereumClient,
    auctionEventWatcher
  }) {
    this._config = config
    this._eventBus = eventBus
    this._auctionEventWatcher = auctionEventWatcher
    this._ethereumClient = ethereumClient

    // Services
    this._liquidityService = liquidityService
    this._dxInfoService = dxInfoService
    this._dxTradeService = dxTradeService
    this._botsService = botsService

    // Bots
    this._bots = null

    // Initialize bots and API
    this.isReadyPromise = this
      ._getBotAddress(ethereumClient)
      .then(botAddress => this._createBots(botAddress))
      .then(bots => {
        // Set bot list
        logger.info('Initialized %d bots')
        this._bots = bots
        this._botsService.setBots(bots)

        // Initialize the bots API
        this._botsApiServer = new BotsApiServer({
          port: this._config.BOTS_API_PORT,
          host: this._config.BOTS_API_HOST,
          botsService: this._botsService
        })
      })
  }

  async start () {
    await this.isReadyPromise

    // Display some basic info
    const version = await this._dxInfoService.getVersion()
    logger.info({
      msg: 'Loading "Bots + Bots API Server" v%s in "%s" environment...',
      params: [ version, this._config.ENVIRONMENT ]
    })
    
    // Run all the bots
    await Promise.all(
      this._bots.map(bot => bot.start())
    )
    logger.info({ msg: 'All bots are ready' })

    // Run Bots Api server
    await this._botsApiServer.start()

    // Watch auction events
    await this._auctionEventWatcher.start()
    logger.info({ msg: 'App ready!' })
  }

  async stop () {
    logger.info({ msg: 'Shut down App' })

    // Stop the Bots API Server
    if (this._botsApiServer) {
      this._botsApiServer.stop()
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
    logger.info({ msg: 'App is ready to shut down' })
  }

  _createBots (botAddress) {
    // Sell Liquidity bot
    const SellLiquidityBot = require('./bots/SellLiquidityBot')
    const sellLiquidityBot = new SellLiquidityBot({
      name: 'SellLiquidityBot',
      eventBus: this._eventBus,
      liquidityService: this._liquidityService,
      botAddress,
      markets: this._config.MARKETS
    })

    // Buy Liquidity Bot
    const BuyLiquidityBot = require('./bots/BuyLiquidityBot')
    const buyLiquidityBot = new BuyLiquidityBot({
      name: 'BuyLiquidityBot',
      eventBus: this._eventBus,
      liquidityService: this._liquidityService,
      botAddress,
      markets: this._config.MARKETS
    })

    // Buy Liquidity Bot
    const BalanceCheckBot = require('./bots/BalanceCheckBot')
    const balanceCheckBot = new BalanceCheckBot({
      name: 'BalanceCheckBot',
      eventBus: this._eventBus,
      liquidityService: this._liquidityService,
      dxInfoService: this._dxInfoService,
      botAddress,
      markets: this._config.MARKETS
    })

    // Return bots
    return [
      sellLiquidityBot,
      buyLiquidityBot,
      balanceCheckBot
    ]
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
