const loggerNamespace = 'dx-service:BotRunner'
const Logger = require('./helpers/Logger')
const logger = new Logger(loggerNamespace)
const assert = require('assert')
const path = require('path')

const getDxInfoService = require('./services/DxInfoService')

// Bot Api
const getBotsApiServer = require('./web/bots/BotsApiServer')

let botFactories = {}

class BotRunner {
  constructor ({ config }) {
    this.initialized = false
    this._config = config
  }

  async init () {
    const dxInfoService = await getDxInfoService()

    this._dxInfoService = dxInfoService

    // Initialize Bots and API
    this._bots = await this._createBots()

    const watchEventsBotExists = this._bots.some(bot => {
      return bot.type === 'WatchEventsBot'
    })
    assert(watchEventsBotExists, 'WATCH_EVENTS_BOT is mandatory')
    logger.info('Initialized %d bots', this._bots.length)

    // Initialize the bots API Server
    this._botsApiServer = await getBotsApiServer()
    this.initialized = true
  }

  async start () {
    if (!this.initialized) {
      // Init bots and API Server
      await this.init()
    }

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

    logger.info({ msg: 'App is ready to shut down' })
  }

  _createBots () {
    // Create bots from factory
    const bots = this._config
      .BOTS
      .map(botConfig => {
        const BotFactory = this._getBotFactory(botConfig)
        return new BotFactory(botConfig)
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

  async _notifyStart (version) {
    const message = `Starting Bots and Bots API Server v${version} in \
"${this._config.ENVIRONMENT}" environment`

    this._dxInfoService.notifySlack(message, logger)
  }

  async _notifyStop (version) {
    const message = `Stopping Bots and Bots API Server v${version} in \
"${this._config.ENVIRONMENT}" environment`

    this._dxInfoService.notifySlack(message, logger)
  }
}

module.exports = BotRunner
