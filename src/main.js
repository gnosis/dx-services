const debug = require('debug')('dx-service:main')
const gracefullShutdown = require('./helpers/gracefullShutdown')

const SellLiquidityBot = require('./bots/SellLiquidityBot')
const DxApiServer = require('./api/DxApiServer')

const instanceFactory = require('./helpers/instanceFactory')
const environment = process.env.NODE_ENV
const isLocal = environment === 'local'

// Run app
instanceFactory({})
  .then(instances => {
    // Create and start app
    const app = new App(instances)
    app.start()
      .catch(handleError)

    // shutdown app
    gracefullShutdown.onShutdown(() => {
      return app.stop()
    })
  })
  .catch(handleError)

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

    // Create server
    this._dxApiServer = new DxApiServer({
      port: config.API_PORT,
      host: config.API_HOST,
      apiService
    })

    // Initialize the bots
    this.ready = _getBotAddress(ethereumClient)
      .then(botAddress => {
        // Liquidity bot
        const sellLiquidityBot = new SellLiquidityBot({
          eventBus: this._eventBus,
          botService,
          botAddress
        })
        this._bots = [ sellLiquidityBot ]
      })
  }

  async start () {
    await this.ready

    // Display some basic info
    const about = await this._botService.getAbout()
    debug('Loading app in %s environment with %o ...',
      this._config.ENVIRONMENT,
      about
    )

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

async function _getBotAddress (ethereumClient) {
  return ethereumClient
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
