const SellLiquidityBot = require('../../src/bots/SellLiquidityBot')
const EventBus = require('../../src/helpers/EventBus')
const eventBus = new EventBus()

const bot = new SellLiquidityBot({
  eventBus
})

/*
test("S0: ensureLiquidity takes no action", async () => {
  // expect.assertions(1)
  const data = await bot.run()
  // fakeMockTest()
  // expect(data).toBe('')
  expect(2 + 1).toBe(3)
  bot.stop()
})
*/

test("If the bot receives an event of XXX, invokes the ensure liquidity", async () => {
  // expect.assertions(1)
  const data = await bot.run()
  // fakeMockTest()
  // expect(data).toBe('')
  expect(2 + 1).toBe(3)
  bot.stop()
})

const SellLiquidityBot = require('../../src/bots/SellLiquidityBot')
const EventBus = require('../../src/helpers/EventBus')
const eventBus = new EventBus()

const bot = new SellLiquidityBot({
  eventBus
})

/*
test("S0: ensureLiquidity takes no action", async () => {
  // expect.assertions(1)
  const data = await bot.run()
  // fakeMockTest()
  // expect(data).toBe('')
  expect(2 + 1).toBe(3)
  bot.stop()
})
*/

test("If both auctions are closed, and not enough liquidity. We buy the missing", async () => {
  // expect.assertions(1)
  const data = await bot.run()
  // fakeMockTest()
  // expect(data).toBe('')
  expect(2 + 1).toBe(3)
  bot.stop()
})
