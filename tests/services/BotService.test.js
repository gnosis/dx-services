const testSetup = require('../helpers/testSetup')
const AuctionRepoMock = require('../../src/repositories/AuctionRepo/AuctionRepoMock')
const auctionRepoMock = new AuctionRepoMock({})

const auctionsMockData = require('../data/auctions')

const BigNumber = require('bignumber.js')

const setupPromise = testSetup()

const PRICE_RDN_ETH = 0.00361234
const PRICE_ETH_USD = 1112.00

const getPriceMock = jest.fn(({ tokenA, tokenB }) => {
  if (tokenA === 'RDN' && tokenB === 'ETH') {
    return PRICE_RDN_ETH
  } else if (tokenA === 'ETH' && tokenB === 'USD') {
    return PRICE_ETH_USD
  }
  throw Error('Unknown mock tokens. tokenA=' + tokenA + ', tokenB=' + tokenB)
})

test.skip('If both auctions are closed, and not enough liquidity. We buy the missing', async () => {
  const { botService } = await setupPromise

  // we mock the auction repo
  botService._auctionRepo = {
    getPrice: getPriceMock
  }

  // TODO: real impl, this is just an example on how to mock the repo
  const price = await botService.testToDelete({ tokenA: 'RDN', tokenB: 'ETH' })
  expect(price).toBe(PRICE_RDN_ETH)
})

test('It should ensureSellLiquidity', async () => {
  const { botService } = await setupPromise

  function _isValidSellVolume (sellVolume, fundingSellVolume) {
    return sellVolume.greaterThan(fundingSellVolume)
  }

  // GIVEN a not RUNNING auction, without enough sell liquidiy
  const updatedAuction = Object.assign({}, auctionsMockData.auctions['ETH-OMG'],
    { sellVolume: new BigNumber('0.5e18') })
  const auctions = Object.assign({}, auctionsMockData.auctions,
    { 'ETH-OMG': updatedAuction })
  // we mock the auction repo
  botService._auctionRepo = new AuctionRepoMock({ auctions })

  // WHEN we ensure sell liquidity
  const ensureLiquidityState = await botService.ensureSellLiquidity({
    sellToken: 'OMG', buyToken: 'ETH', from: '0x123' })

  // THEN
  expect(ensureLiquidityState)
    .toMatchObject({ amount: new BigNumber('523.97'), buyToken: 'OMG', sellToken: 'ETH' })

  // THEN new sell volume is valid
  let newSellVolume = await botService._auctionRepo.getSellVolume({ sellToken: 'ETH', buyToken: 'OMG' })
  expect(_isValidSellVolume(newSellVolume, new BigNumber('0.5e18')))
    .toBeTruthy()
})

test('It should not ensure liquidity if auction is not waiting for funding', async () => {
  const { botService } = await setupPromise
  // we mock the auction repo
  botService._auctionRepo = auctionRepoMock

  // GIVEN a running auction

  // WHEN we ensure sell liquidity
  const ensureLiquidityState = await botService.ensureSellLiquidity({
    sellToken: 'RDN', buyToken: 'ETH', from: '0x123' })

  // THEN we shouldn't be adding funds
  expect(ensureLiquidityState).toBeNull()
})

test('It should not ensure liquidity if auction has enough funds', async () => {
  const { botService } = await setupPromise
  expect.assertions(1)
  // we mock the auction repo
  botService._auctionRepo = auctionRepoMock

  // GIVEN an auction with enough funds

  try {
    // WHEN we ensure sell liquidity
    await botService.ensureSellLiquidity({
      sellToken: 'OMG', buyToken: 'ETH', from: '0x123' })
  } catch (e) {
    // THEN we get an error becuse we shouldn't ensure liquidity
    expect(e).toBeInstanceOf(Error)
  }
})
