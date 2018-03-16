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

  // we mock the auction repo
  botService._auctionRepo = new AuctionRepoMock({
    auctions: _getAuctionsWithUnderFundingEthOmg()
  })

  async function _isUnderFundingAuction ({ tokenA, tokenB }) {
    const auctionIndex = await botService._auctionRepo.getAuctionIndex({
      sellToken: tokenA, buyToken: tokenB })
    const { fundingA, fundingB } = await botService._auctionRepo.getFundingInUSD({
      tokenA, tokenB, auctionIndex
    })

    return fundingA.lessThan(MINIMUM_SELL_VOLUME) &&
    fundingB.lessThan(MINIMUM_SELL_VOLUME)
  }

  function _isValidSellVolume (sellVolume, fundingSellVolume) {
    return sellVolume.greaterThan(fundingSellVolume)
  }

  // GIVEN a not RUNNING auction, without enough sell liquidiy
  expect(await _isUnderFundingAuction({ tokenA: 'OMG', tokenB: 'ETH' }))
    .toBeTruthy()

  // WHEN we ensure sell liquidity
  const ensureLiquidityState = await botService.ensureSellLiquidity({
    sellToken: 'OMG', buyToken: 'ETH', from: '0x123' })

  // THEN bot sells in OMG-ETH, the pair market we expect
  const expectedBotSell = {
    buyToken: 'OMG',
    sellToken: 'ETH'
  }
  expect(ensureLiquidityState).toMatchObject(expectedBotSell)

  // THEN new sell volume is valid
  let currentSellVolume = await botService._auctionRepo.getSellVolume({ sellToken: 'ETH', buyToken: 'OMG' })
  expect(_isValidSellVolume(currentSellVolume, UNDER_MINIMUM_FUNDING_ETH))
    .toBeTruthy()
  expect(_isValidSellVolume(currentSellVolume, ensureLiquidityState.amount))
    .toBeTruthy()

  // THEN is not underfunding auction
  expect(await _isUnderFundingAuction({ tokenA: 'OMG', tokenB: 'ETH' }))
    .toBeFalsy()
})

test('It should detect concurrency when ensuring liquidiy', async () => {
  const { botService } = await setupPromise

  // GIVEN a not RUNNING auction, without enough sell liquidiy
  // we mock the auction repo
  botService._auctionRepo = new AuctionRepoMock({
    auctions: _getAuctionsWithUnderFundingEthOmg()
  })

  // we wrap postSellOrder with jest mock functionalities
  const postSellOrder = jest.fn(botService._auctionRepo.postSellOrder)
  botService._auctionRepo.postSellOrder = postSellOrder

  // GIVEN no calls to postSellOrder function
  expect(postSellOrder.mock.calls.length).toBe(0)

  // WHEN we ensure sell liquidity twice
  let ensureLiquidityPromise1 = botService.ensureSellLiquidity({
    sellToken: 'OMG', buyToken: 'ETH', from: '0x123' })
  let ensureLiquidityPromise2 = botService.ensureSellLiquidity({
    sellToken: 'OMG', buyToken: 'ETH', from: '0x123' })

  await ensureLiquidityPromise1
  await ensureLiquidityPromise2

  // THEN expect 1 call to postSellOrder function
  expect(postSellOrder.mock.calls.length).toBe(1)
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

// DX Fee up to 0.5%
// const MAXIMUM_DX_FEE = 0.005

const MINIMUM_SELL_VOLUME = 1000

const UNDER_MINIMUM_FUNDING_ETH = new BigNumber('0.5e18')

function _getAuctionsWithUnderFundingEthOmg () {
  // GIVEN a not RUNNING auction, without enough sell liquidiy
  const updatedAuction = Object.assign({}, auctionsMockData.auctions['ETH-OMG'],
    { sellVolume: new BigNumber('0.5e18') })
  return Object.assign({}, auctionsMockData.auctions,
    { 'ETH-OMG': updatedAuction })
}
