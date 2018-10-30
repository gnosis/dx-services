const loggerNamespace = 'dx-service:runBots'
const Logger = require('./helpers/Logger')
const logger = new Logger(loggerNamespace)
const assert = require('assert')

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
    marketService,

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
    this._marketService = marketService

    // Bots
    this._bots = null

    // Initialize bots and API
    this.isReadyPromise = this._createBots()
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
          reportService: this._reportService,
          ethereumClient: this._ethereumClient,
          config: this._config
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

  _createBots () {
    let bots = []
    const botTypes = {
      SellLiquidityBot: require('./bots/SellLiquidityBot'),
      BuyLiquidityBot: require('./bots/BuyLiquidityBot')
    }

    const _createBot = async (botConfig, botInstanceType, slackChannel) => {
      const botAddress = await getBotAddress(this._ethereumClient, botConfig.accountIndex)
      assert(botAddress, 'The bot address was not configured. Define the MNEMONIC environment var')
      const { name, markets, rules, notifications, ...aditionalBotConfig } = botConfig

      return new botTypes[botInstanceType]({
        name,
        eventBus: this._eventBus,
        liquidityService: this._liquidityService,
        botAddress,
        markets,
        slackClient: this._slackClient,
        botTransactionsSlackChannel: slackChannel,
        buyLiquidityRules: rules,
        notifications,
        ...aditionalBotConfig
      })
    }

    // Sell Liquidity bots
    const sellLiquidityBotPromises = this._config.SELL_LIQUIDITY_BOTS.map(botConfig => {
      return _createBot(botConfig, 'SellLiquidityBot', this._config.SLACK_CHANNEL_BOT_TRANSACTIONS)
    })

    // Buy Liquidity Bots
    const buyLiquidityBotPromises = this._config.BUY_LIQUIDITY_BOTS.map(botConfig => {
      return _createBot(botConfig, 'BuyLiquidityBot', this._config.SLACK_CHANNEL_BOT_TRANSACTIONS)
    })

    const HighSellVolumeBot = require('./bots/HighSellVolumeBot')
    const highSellVolumeBotPromises = this._config.BUY_LIQUIDITY_BOTS.map(async botConfig => {
      const botAddress = await getBotAddress(this._ethereumClient, botConfig.accountIndex)
      assert(botAddress, 'The bot address was not configured. Define the MNEMONIC environment var')
      // We discard checkTimeInMilliseconds because that is for the buyBot
      const { name, checkTimeInMilliseconds, ...aditionalBotConfig } = botConfig

      return new HighSellVolumeBot({
        name: 'HighSellVolumeBot for: ' + botConfig.name,
        dxInfoService: this._dxInfoService,
        marketService: this._marketService,
        botAddress,
        slackClient: this._slackClient,
        botTransactionsSlackChannel: this._config.SLACK_CHANNEL_BOT_FUNDING,
        ...aditionalBotConfig
      })
    })

    // Balance Check Bot Config
    const buyAndSellBotsConfig = [].concat(
      this._config.BUY_LIQUIDITY_BOTS,
      this._config.SELL_LIQUIDITY_BOTS)

    function _getAccountMarkets (accountMarkets, {
      accountIndex,
      markets,
      name,
      minimunAmountInUsdForToken,
      minimunAmountForEther
    }) {
      if (!accountMarkets.hasOwnProperty(accountIndex)) {
        accountMarkets[accountIndex] = {
          name: name,
          tokens: [],
          minimunAmountInUsdForToken,
          minimunAmountForEther
        }
      } else {
        accountMarkets[accountIndex].name += ', ' + name
      }

      markets.forEach(({ tokenA, tokenB }) => {
        if (!accountMarkets[accountIndex].tokens.includes(tokenA)) {
          accountMarkets[accountIndex].tokens.push(tokenA)
        }
        if (!accountMarkets[accountIndex].tokens.includes(tokenB)) {
          accountMarkets[accountIndex].tokens.push(tokenB)
        }
      })
      return accountMarkets
    }

    // i.e { '0x12345': { name: '', tokens: [] }]
    const tokensByAccount = buyAndSellBotsConfig.reduce((accountMarkets, botConfig) => {
      return _getAccountMarkets(accountMarkets, botConfig)
    }, {})

    // Balance Check Bot
    const BalanceCheckBot = require('./bots/BalanceCheckBot')
    const balanceCheckBotPromise = new BalanceCheckBot({
      name: 'BalanceCheckBot',
      liquidityService: this._liquidityService,
      dxInfoService: this._dxInfoService,
      ethereumClient: this._ethereumClient,
      tokensByAccount,
      slackClient: this._slackClient,
      botFundingSlackChannel: this._config.SLACK_CHANNEL_BOT_FUNDING
    })
    // TODO: UsageReportBot Report bot. this._config.SLACK_CHANNEL_AUCTIONS_REPORT

    if (this._config.DEPOSIT_BOT) {
      const aditionalBotConfig = this._config.DEPOSIT_BOT
      const DepositBot = require('./bots/DepositBot')
      const depositBotPromise = new DepositBot({
        dxTradeService: this._dxTradeService,
        dxInfoService: this._dxInfoService,
        ethereumClient: this._ethereumClient,
        tokensByAccount,
        slackClient: this._slackClient,
        botTransactionsSlackChannel: this._config.SLACK_CHANNEL_BOT_TRANSACTIONS,
        ...aditionalBotConfig
      })
      bots.push(depositBotPromise)
    }

    // Return bots
    return Promise.all(
      bots.concat(
        sellLiquidityBotPromises,
        buyLiquidityBotPromises,
        highSellVolumeBotPromises,
        balanceCheckBotPromise
      )
    )
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
