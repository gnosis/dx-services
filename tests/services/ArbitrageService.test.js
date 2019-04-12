// const testSetup = require('../helpers/testSetup')
// const AuctionRepoMock = require('../../src/repositories/AuctionRepo/AuctionRepoMock')
// const auctionRepoMock = new AuctionRepoMock({})
//
// const ArbitrageRepoMock = require('../../src/repositories/ArbitrageRepo/ArbitrageRepoMock')
// const arbitrageRepoMock = new ArbitrageRepoMock({})
//
// const PriceRepoMock = require('../../src/repositories/PriceRepo/PriceRepoMock')
// const priceRepo = new PriceRepoMock()
//
// const auctionsMockData = require('../data/auctions')
// const clone = require('lodash.clonedeep')
//
// const BigNumber = require('bignumber.js')
//
// const setupPromise = testSetup()
//
// test('It should ensureSellLiquidity', async () => {
//   const { liquidityService } = await setupPromise
//
//   // we mock the auction repo
//   liquidityService._auctionRepo = new AuctionRepoMock({
//     auctions: _getAuctionsWithUnderFundingEthOmg()
//   })
//
//   async function _isUnderFundingAuction ({ tokenA, tokenB }) {
//     const auctionIndex = await liquidityService._auctionRepo.getAuctionIndex({
//       sellToken: tokenA, buyToken: tokenB })
//     const { fundingA, fundingB } = await liquidityService._auctionRepo.getFundingInUSD({
//       tokenA, tokenB, auctionIndex
//     })
//
//     return fundingA.lessThan(MINIMUM_SELL_VOLUME) &&
//     fundingB.lessThan(MINIMUM_SELL_VOLUME)
//   }
//
//   function _isValidSellVolume (sellVolume, fundingSellVolume) {
//     return sellVolume.greaterThan(fundingSellVolume)
//   }
//
//   // GIVEN a not RUNNING auction, without enough sell liquidiy
//   expect(await _isUnderFundingAuction({ tokenA: 'OMG', tokenB: 'WETH' }))
//     .toBeTruthy()
//
//   // WHEN we ensure sell liquidity
//   const ensureLiquidityState = await liquidityService.ensureSellLiquidity({
//     sellToken: 'OMG', buyToken: 'WETH', from: '0x123', waitToReleaseTheLock: false })
//
//   // THEN bot sells in both sides, WETH-OMG and OMG-WETH, the pair market we expect
//   const expectedBotSell = [{
//     buyToken: 'WETH',
//     sellToken: 'OMG'
//   }, {
//     buyToken: 'OMG',
//     sellToken: 'WETH'
//   }]
//   expect(ensureLiquidityState).toMatchObject(expectedBotSell)
//
//   // THEN new sell volume is valid
//   let currentSellVolume = await liquidityService._auctionRepo.getSellVolume({ sellToken: 'WETH', buyToken: 'OMG' })
//   expect(_isValidSellVolume(currentSellVolume, UNDER_MINIMUM_FUNDING_WETH))
//     .toBeTruthy()
//   expect(_isValidSellVolume(currentSellVolume, ensureLiquidityState[0].amount))
//     .toBeTruthy()
//
//   // THEN is not underfunding auction
//   expect(await _isUnderFundingAuction({ tokenA: 'OMG', tokenB: 'WETH' }))
//     .toBeFalsy()
// })
//
// test('It should not ensureBuyLiquidity if auction has closed', async () => {
//   const { liquidityService } = await setupPromise
//
//   // we mock the auction repo
//   liquidityService._auctionRepo = new AuctionRepoMock({
//     auctions: _getClosedAuctions()
//   })
//   // we mock the exchange price repo
//   liquidityService._priceRepo = priceRepo
//
//   // GIVEN a CLOSED auction, with enough buy volume
//   expect(await _hasLowBuyVolume(
//     { sellToken: 'WETH', buyToken: 'RDN' },
//     liquidityService._auctionRepo
//   )).toBeFalsy()
//
//   // WHEN we ensure buy liquidity
//   const ensureLiquidityState = await liquidityService.ensureBuyLiquidity({
//     sellToken: 'WETH', buyToken: 'RDN', from: '0x123', waitToReleaseTheLock: false })
//
//   // THEN the bot don't buy anything
//   const expectedBotBuy = []
//   expect(ensureLiquidityState).toMatchObject(expectedBotBuy)
// })
//
test.skip('It should detect concurrency when checking arbitrage', async () => {
  // const { arbitrageService } = await setupPromise
  //
  // // GIVEN a not RUNNING auction, without enough sell liquidiy
  // // we mock the auction repo
  // arbitrageService._auctionRepo = new AuctionRepoMock({
  //   auctions: _getAuctionsWithUnderFundingEthOmg()
  // })

  // // we wrap dutchOpportunity with jest mock functionalities
  // const dutchOpportunity = jest.fn(arbitrageService._arbitrageRepo.dutchOpportunity)
  // arbitrageService._arbitrageRepo.dutchOpportunity = dutchOpportunity
  //
  // // GIVEN no calls to dutchOpportunity function
  // expect(dutchOpportunity.mock.calls.length).toBe(0)
  //
  // // WHEN we ensure sell liquidity twice
  // let ensureLiquidityPromise1 = arbitrageService.checkUniswapArbitrage({
  //   sellToken: 'OMG', buyToken: 'WETH', from: '0x123', waitToReleaseTheLock: false })
  // let ensureLiquidityPromise2 = arbitrageService.checkUniswapArbitrage({
  //   sellToken: 'OMG', buyToken: 'WETH', from: '0x123', waitToReleaseTheLock: false })
  //
  // await Promise.all([
  //   ensureLiquidityPromise1,
  //   ensureLiquidityPromise2
  // ])
  //
  // // THEN expect 2 calls to dutchOpportunity function ensuring liquidity to both sides
  // // of the token pair
  // expect(dutchOpportunity.mock.calls.length).toBe(2)
})
