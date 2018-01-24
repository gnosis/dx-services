const SellLiquidityBot = require('../../src/bots/SellLiquidityBot')
const EventBus = require('../../src/helpers/EventBus')
const eventBus = new EventBus()

const bot = new SellLiquidityBot({
  eventBus
})

test('sellLiquidityBot is running', async () => {
  // expect.assertions(1)
  const data = await bot.run()
  fakeMockTest()
  // expect(data).toBe('')
  bot.stop()
})

function fakeMockTest () {
  // setTimeout(() => {
    eventBus.trigger('AUCTION_START', {
      startTime: new Date(),
      auctionId: 12345,
      tokenA: 'RDN',
      tokenB: 'ETH'
    })
  // }, 2000)

  // setTimeout(() => {
    eventBus.trigger('AUCTION_END', {
      auctionId: 12345,
      tokenA: 'RDN',
      tokenB: 'ETH'
    })
  // }, 4000)
}
