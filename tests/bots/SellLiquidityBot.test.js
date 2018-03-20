const SellLiquidityBot = require('../../src/bots/SellLiquidityBot')
const EventBus = require('../../src/helpers/EventBus')

const testSetup = require('../helpers/testSetup')
const setupPromise = testSetup()

const BigNumber = require('bignumber.js')

const MARKETS = [
  { tokenA: 'ETH', tokenB: 'RDN' },
  { tokenA: 'ETH', tokenB: 'OMG' }
]

let sellLiquidityBot

beforeEach(async () => {
  const { botService } = await setupPromise

  sellLiquidityBot = new SellLiquidityBot({
    name: 'SellLiquidityBot',
    eventBus: new EventBus(),
    botService,
    botAddress: '0x123',
    markets: MARKETS
  })

  sellLiquidityBot.start()
})

afterEach(() => {
  sellLiquidityBot.stop()
})

test('It should trigger ensure liquidity from eventBus trigger', () => {
  // we mock ensureSellLiquidity function
  sellLiquidityBot._botService.ensureSellLiquidity = jest.fn(_ensureLiquidity)

  // we wrap expected eventBus triggered function with mock
  sellLiquidityBot._onAuctionCleared = jest.fn(sellLiquidityBot._onAuctionCleared)

  // GIVEN uncalled liquidity functions
  expect(sellLiquidityBot._onAuctionCleared).toHaveBeenCalledTimes(0)
  expect(sellLiquidityBot._botService.ensureSellLiquidity).toHaveBeenCalledTimes(0)

  // WHEN we trigger 'auction:cleared' event
  sellLiquidityBot._eventBus.trigger('auction:cleared', {buyToken: 'RDN', sellToken: 'ETH'})

  // THEN liquidity ensuring functions have been called
  expect(sellLiquidityBot._onAuctionCleared).toHaveBeenCalledTimes(1)
  expect(sellLiquidityBot._botService.ensureSellLiquidity).toHaveBeenCalledTimes(1)
})

test('It should not ensure liquidity if already ensuring liquidity.', () => {
  expect.assertions(1)
  // we mock ensureSellLiquidity function
  sellLiquidityBot._botService.ensureSellLiquidity = _concurrentLiquidityEnsured

  // GIVEN a running bot

  // WHEN we ensure liquidity
  const ENSURE_LIQUIDITY = sellLiquidityBot._onAuctionCleared('auction:cleared',
    {buyToken: 'RDN', sellToken: 'ETH'})

  // THEN liquidiy is ensured correctly
  ENSURE_LIQUIDITY.then(result => {
    expect(result).toBeTruthy()
  })
})

test('It should ensure liquidity.', () => {
  expect.assertions(3)
  // we mock ensureSellLiquidity function
  sellLiquidityBot._botService.ensureSellLiquidity = jest.fn(_ensureLiquidity)

  // GIVEN
  expect(sellLiquidityBot._botService.ensureSellLiquidity).toHaveBeenCalledTimes(0)

  // WHEN we ensure liquidity
  const ENSURE_LIQUIDITY = sellLiquidityBot._onAuctionCleared('auction:cleared',
    {buyToken: 'RDN', sellToken: 'ETH'})

  // THEN liquidiy is ensured correctly
  ENSURE_LIQUIDITY.then(result => {
    expect(result).toBeTruthy()
  })
  expect(sellLiquidityBot._botService.ensureSellLiquidity).toHaveBeenCalledTimes(1)
})

test.skip('It should do a routine check.', async () => {
  // we mock ensureSellLiquidity function
  sellLiquidityBot._botService.ensureSellLiquidity = jest.fn(_ensureLiquidity)

  // GIVEN
  expect(sellLiquidityBot._botService.ensureSellLiquidity).toHaveBeenCalledTimes(0)

  // const spy = jest.spyOn(sellLiquidityBot, '_doRoutineLiquidityCheck')
  // WHEN we ensure liquidity
  jest.useFakeTimers()
  // jest.advanceTimersByTime(ENSURE_LIQUIDITY_PERIODIC_CHECK_MILLISECONDS *10)
  jest.runAllTimers()
  // const ENSURE_LIQUIDITY = sellLiquidityBot._onAuctionCleared('auction:cleared',
  //   {buyToken: 'RDN', sellToken: 'ETH'})

  // THEN liquidiy is ensured correctly
  // expect(await ENSURE_LIQUIDITY).toBeTruthy()
  // expect(await spy).toHaveBeenCalled()
  expect(sellLiquidityBot._botService.ensureSellLiquidity).toHaveBeenCalledTimes(1)
})

// const ENSURE_LIQUIDITY_PERIODIC_CHECK_MILLISECONDS = 60 * 1000

function _concurrentLiquidityEnsured ({ sellToken, buyToken, from }) {
  return Promise.resolve(null)
}

function _ensureLiquidity ({ sellToken, buyToken, from }) {
  return Promise.resolve({
    sellToken,
    buyToken,
    amount: new BigNumber('522943983903581200'),
    amountInUSD: new BigNumber('523.97')
  })
}
