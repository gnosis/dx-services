const debug = require('debug')('dx-service:main')

const SellLiquidityBot = require('./bots/SellLiquidityBot')
const AuctionEventWatcher = require('./bots/AuctionEventWatcher')
const AuctionEventsBus = require('./helpers/AuctionEventsBus')
const {
  auctionService
} = require('./helpers/instanceFactory')

// Create the eventBus
const auctionEventsBus = new AuctionEventsBus()

// Create liquidity bot
const sellLiquidityBot = new SellLiquidityBot({
  auctionEventsBus,
  auctionService
})

const auctionEventWatcher = new AuctionEventWatcher({
  auctionEventsBus,
  auctionService
})

// Watch market events
debug('Watching market events...')
auctionEventWatcher
  .startWatching()
  .then(() => {
    // Run bots
    debug('Starting liquidity bot...')
    sellLiquidityBot.run()
  })
  .catch(error => {
    process.exitCode = 1
    console.error(`ERORR in dx-service main: ${error.message}`)
    // Rethrow error
    throw error
  })
  .finally(() => {
    debug('End of the execution. Bye!')
  })

function closeGracefully (signal) {
  debug("I've gotten a %o signal! Closing gracefully", signal)

  debug("I'm shutting down...")
  auctionEventWatcher.stopWatching(() => {
    debug('The app is ready to shutdown! Good bye! :)')
    process.exit(0)
  })
}

['SIGINT', 'SIGTERM', 'SIGQUIT'].forEach(signal => {
  process.on(signal, () => closeGracefully(signal))
})
