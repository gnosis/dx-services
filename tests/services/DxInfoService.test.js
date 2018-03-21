const testSetup = require('../helpers/testSetup')
const AuctionRepoMock = require('../../src/repositories/AuctionRepo/AuctionRepoMock')
const auctionRepoMock = new AuctionRepoMock({})

const auctionsMockData = require('../data/auctions')

const BigNumber = require('bignumber.js')

const setupPromise = testSetup()

test('It should return available markets', async () => {
  const { dxInfoService } = await setupPromise

  dxInfoService._auctionRepo = auctionRepoMock
  const EXPECTED_MARKETS = [
    {tokenA: 'ETH', tokenB: 'RDN'}, {tokenA: 'ETH', tokenB: 'OMG'}
  ]

  expect(await dxInfoService.getMarkets()).toEqual(EXPECTED_MARKETS)
})

test('It should return auction index', async () => {
  const { dxInfoService } = await setupPromise

  dxInfoService._auctionRepo = auctionRepoMock

  let rdnEthAuctionIndex = await dxInfoService.getAuctionIndex({
    sellToken: 'RDN', buyToken: 'ETH' })
  expect(rdnEthAuctionIndex).toBe(77)
})

test.skip('It should return market details', async () => {
  const { dxInfoService } = await setupPromise

  dxInfoService._auctionRepo = auctionRepoMock

  expect(await dxInfoService.getMarketDetails({ sellToken: 'RDN', buyToken: 'ETH' })).toBe('')
})

test.skip('It should return auction details', async () => {
  const { dxInfoService } = await setupPromise

  dxInfoService._auctionRepo = auctionRepoMock

  let rdnEthAuction = auctionsMockData.auctions['RDN-ETH']
  let rdnEthAuctions = {
    auctionIndex: rdnEthAuction.index,
    auctionInfo: {
      auction: {
        buyVolume: rdnEthAuction.buyVolume
      }
    }
  }

  expect(await dxInfoService.getAuctions({currencyA: 'RDN', currencyB: 'ETH'})).toBe(rdnEthAuctions)
})

test('It should return current auction price', async () => {
  const { dxInfoService } = await setupPromise

  dxInfoService._auctionRepo = auctionRepoMock

  const RDN_ETH_CURRENT_PRICE = {
    denominator: new BigNumber('233'),
    numerator: new BigNumber('10')
  }

  let rdnEthCurrentPrice = await dxInfoService.getCurrentPrice({
    sellToken: 'RDN', buyToken: 'ETH' })
  expect(rdnEthCurrentPrice).toMatchObject(RDN_ETH_CURRENT_PRICE)
})

// test('Get balances for all currencies of an account', async () => {
// const { dxInfoService } = await setupPromise
//
//   expect(await dxInfoService.getBalances({address: '0xAbasdlkjasdkljg231lkjmn123'})).toBe('')
// })
