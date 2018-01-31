const debug = require('debug')('dx-service:main')
const gracefullShutdown = require('./helpers/gracefullShutdown')

const SellLiquidityBot = require('./bots/SellLiquidityBot')
const AuctionEventWatcher = require('./bots/AuctionEventWatcher')
const EventBus = require('./helpers/EventBus')
const DxApiServer = require('./api/DxApiServer')

const instanceFactory = require('./helpers/instanceFactory')

// Run app
instanceFactory({})
  .then(instances => {
    // Create and start app
    const app = new App(instances)
    app.start()

    // shutdown app
    gracefullShutdown.onShutdown(() => {
      return app.stop()
    })
  })
  .catch(handleError)

class App {
  constructor ({ config, botService }) {
    this._config = config
    this._botService = botService

    // Create server
    this._dxApiServer = new DxApiServer({
      port: config.API_PORT,
      host: config.API_HOST,
      botService
    })

    // Create the eventBus
    this._eventBus = new EventBus()

    // Create event watcher
    this._auctionEventWatcher = new AuctionEventWatcher({
      eventBus: this._eventBus,
      botService,
      markets: config.MARKETS
    })

    // Create bots
    this._bots = [
      // Liquidity bot
      new SellLiquidityBot({
        eventBus: this._eventBus,
        botService
      })
    ]
  }

  async start () {
    // Display some basic info
    this._botService
      .getAbout()
      .then(about => debug('Loading app with %o ...', about))
      .catch(handleError)

    // Run all the bots
    await Promise.all(
      this._bots.map(bot => bot.run())
    )
    debug('All bots are ready')

    // Run Api server
    await this._dxApiServer.start()

    // Watch auction events
    await this._auctionEventWatcher.startWatching()
    debug('App ready!')
  }

  async stop () {
    debug('Shut down App')
    // Stop watching events
    // Stop the API Server
    await Promise.all([
      // this._auctionEventWatcher.stopWatching(),
      this._dxApiServer.stop()
    ])

    // Stop the bots
    debug('Stopping the bots')
    await Promise.all(
      this._bots.map(async bot => bot.stop())
    )

    // Clear listerners
    this._eventBus.clearAllListeners()
    debug('App is ready to shutDown')
  }
}

function handleError (error) {
  process.exitCode = 1
  console.error(`ERORR in dx-service main: ${error.message}`)
  console.error(error)
  debug('Something went wrong....')
  // Rethrow error
  throw error
}
