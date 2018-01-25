const debug = require('debug')('dx-service:main')
const Promise = require('./helpers/Promise')

const SellLiquidityBot = require('./bots/SellLiquidityBot')
const AuctionEventWatcher = require('./bots/AuctionEventWatcher')
const EventBus = require('./helpers/EventBus')
const DxApiServer = require('./DxApiServer')

const {
  config,
  auctionService
} = require('./helpers/instanceFactory')

// Create the eventBus and event watcher
const eventBus = new EventBus()
const auctionEventWatcher = new AuctionEventWatcher({
  eventBus,
  auctionService,
  markets: config.MARKETS
})

// Create bots
const bots = [
  // Liquidity bot
  new SellLiquidityBot({
    eventBus,
    auctionService
  })
]

// Create server
const dxApiServer = new DxApiServer({
  port: 8080 // todo: use config
})

// Run all the bots and start server
Promise.all(
  bots.map(bot => bot.run())
    .concat([ dxApiServer.start() ])
)
  .then(() => {
    // Watch auction events
    debug('All bots are ready')
    return auctionEventWatcher.startWatching()
  })
  .catch(error => {
    process.exitCode = 1
    console.error(`ERORR in dx-service main: ${error.message}`)
    console.error(error)
    debug('Something went wrong....')
    // Rethrow error
    throw error
  })
  .finally(() => debug('End of the execution. Bye!'))

function closeGracefully (signal) {
  debug("I've gotten a %o signal! Closing gracefully", signal)

  auctionEventWatcher
    // Stop watching events
    .stopWatching()
    .then(() => {
      // Stop all bots
      return Promise.all([
        bots.map(bot => bot.stop())
          .concat([ dxApiServer.stop() ])
      ])
    })
    .then(() => {
      // Clear listerners
      eventBus.clearAllListeners()
      debug('The app is ready to shutdown! Good bye! :)')
      process.exit(0)
    })
}

['SIGINT', 'SIGTERM', 'SIGQUIT'].forEach(signal => {
  process.on(signal, () => closeGracefully(signal))
})
