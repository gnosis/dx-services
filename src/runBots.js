const loggerNamespace = 'dx-service:runBots'
const Logger = require('./helpers/Logger')
const logger = new Logger(loggerNamespace)
const assert = require('assert')
const path = require('path')

// Helpers
const gracefullShutdown = require('./helpers/gracefullShutdown')
const instanceFactory = require('./helpers/instanceFactory')
const getBotAddress = require('./helpers/getBotAddress')

// Bot Api
const BotsApiServer = require('./web/bots/BotsApiServer')

let app
let botFactories = {}

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
    slackRepo
  }) {
    this._config = config
    this._eventBus = eventBus
    this._ethereumClient = ethereumClient
    this._slackRepo = slackRepo

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
        logger.info('Initialized %d bots', bots.length)
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
    const bots = this._config.BOTS.map(botConfig => {
      const BotFactory = this._getBotFactory(botConfig)

      // TODO: This should be removed one the dependencies are pulled from init method
      const extendedBotConfig = {
        eventBus: this._eventBus,
        liquidityService: this._liquidityService,
        dxInfoService: this._dxInfoService,
        ethereumClient: this._ethereumClient,
        slackRepo: this._slackRepo,
        ...botConfig
      }

      return new BotFactory(extendedBotConfig)
    })

    // Init all the bots
    return Promise.all(bots.map(async bot => {
      if (bot.init) {
        await bot.init()
      }
      return bot
    }))
  }

  _getBotFactory ({ name, factory }) {
    assert(factory, '"factory" is required. Offending bot: ' + name)
    let Factory = botFactories[factory]
    if (!Factory) {
      const factoryPath = path.join('..', factory)
      Factory = require(factoryPath)
      botFactories[factory] = Factory
    }

    return Factory
  }

  // TODO: After refactor remove
  _createBotsOld () {
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
        slackRepo: this._slackRepo,
        botAddress,
        markets,
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

    const highSellVolumeBotsConfig = this._config.BUY_LIQUIDITY_BOTS.filter(botConfig => {
      return (!botConfig.disableHighSellVolumeCheck)
    })
    const HighSellVolumeBot = require('./bots/HighSellVolumeBot')
    const highSellVolumeBotPromises = highSellVolumeBotsConfig.map(async botConfig => {
      const botAddress = await getBotAddress(this._ethereumClient, botConfig.accountIndex)
      assert(botAddress, 'The bot address was not configured. Define the MNEMONIC environment var')
      // We discard checkTimeInMilliseconds because that is for the buyBot
      const { name, checkTimeInMilliseconds, ...aditionalBotConfig } = botConfig

      return new HighSellVolumeBot({
        name: 'HighSellVolumeBot for: ' + botConfig.name,
        dxInfoService: this._dxInfoService,
        marketService: this._marketService,
        botAddress,
        slackRepo: this._slackRepo,
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
      minimumAmountInUsdForToken,
      minimumAmountForEther
    }) {
      if (!accountMarkets.hasOwnProperty(accountIndex)) {
        accountMarkets[accountIndex] = {
          name: name,
          tokens: [],
          minimumAmountInUsdForToken,
          minimumAmountForEther
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
      slackRepo: this._slackRepo,
      tokensByAccount,
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
        slackRepo: this._slackRepo,
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

    if (this._slackRepo.isEnabled()) {
      await this._slackRepo.postMessage({
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

    if (this._slackRepo.isEnabled()) {
      await this._slackRepo.postMessage({
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
