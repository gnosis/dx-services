const loggerNamespace = 'dx-service:runBots'
const Logger = require('./helpers/Logger')
const logger = new Logger(loggerNamespace)

// Helpers
const gracefullShutdown = require('./helpers/gracefullShutdown')
const instanceFactory = require('./helpers/instanceFactory')
const getBotAddress = require('./helpers/getBotAddress')

// Bot Api
const BotsApiServer = require('./web/bots/BotsApiServer')

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
    reportService,

    // Events
    eventBus,
    ethereumClient,
    auctionEventWatcher,
    slackClient
  }) {
    this._config = config
    this._eventBus = eventBus
    this._auctionEventWatcher = auctionEventWatcher
    this._ethereumClient = ethereumClient
    this._slackClient = slackClient

    // Services
    this._liquidityService = liquidityService
    this._dxInfoService = dxInfoService
    this._dxTradeService = dxTradeService
    this._botsService = botsService
    this._reportService = reportService

    // Bots
    this._bots = null

    // Initialize bots and API
    this.isReadyPromise = getBotAddress(ethereumClient)
      .then(botAddress => this._createBots(botAddress))
      .then(bots => {
        // Set bot list
        logger.info('Created %d bots', bots.length)
        this._bots = bots
        this._botsService.setBots(bots)

        // Initialize the bots API
        this._botsApiServer = new BotsApiServer({
          port: this._config.BOTS_API_PORT,
          host: this._config.BOTS_API_HOST,
          botsService: this._botsService,
          reportService: this._reportService
        })
      })
  }

  async start () {
    await this.isReadyPromise

    // Display some basic info
    const version = await this._dxInfoService.getVersion()
    await this._notifyStart(version)
    
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
    const version = await this._dxInfoService.getVersion()
    await this._notifyStop(version)
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
      markets: this._config.MARKETS,
      slackClient: this._slackClient,
      botTransactionsSlackChannel: this._config.SLACK_CHANNEL_BOT_FUNDING
    })

    // Buy Liquidity Bot
    const BuyLiquidityBot = require('./bots/BuyLiquidityBot')
    const buyLiquidityBot = new BuyLiquidityBot({
      name: 'BuyLiquidityBot',
      eventBus: this._eventBus,
      liquidityService: this._liquidityService,
      botAddress,
      markets: this._config.MARKETS,
      slackClient: this._slackClient,
      botTransactionsSlackChannel: this._config.SLACK_CHANNEL_BOT_FUNDING
    })

    // Buy Liquidity Bot
    const BalanceCheckBot = require('./bots/BalanceCheckBot')
    const balanceCheckBot = new BalanceCheckBot({
      name: 'BalanceCheckBot',
      eventBus: this._eventBus,
      liquidityService: this._liquidityService,
      dxInfoService: this._dxInfoService,
      botAddress,
      markets: this._config.MARKETS,
      slackClient: this._slackClient,
      botFundingSlackChannel: this._config.SLACK_CHANNEL_BOT_FUNDING
    })

    // TODO: UsageReportBot Report bot. this._config.SLACK_CHANNEL_AUCTIONS_REPORT

    // Return bots
    return [
      sellLiquidityBot,
      buyLiquidityBot,
      balanceCheckBot
    ]
  }

  

  async _notifyStart (version) {
    const message = `Starting Bots and Bots API Server v${version} in \
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
    const message = `Stopping Bots and Bots API Server v${version} in \
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
