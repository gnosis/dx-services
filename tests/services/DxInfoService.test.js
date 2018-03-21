const testSetup = require('../helpers/testSetup')
const AuctionRepoMock = require('../../src/repositories/AuctionRepo/AuctionRepoMock')
const auctionRepoMock = new AuctionRepoMock({})

const auctionsMockData = require('../data/auctions')

const setupPromise = testSetup()

test.only('It should return available markets', async () => {
  const { dxInfoService } = await setupPromise

  dxInfoService._auctionRepo = auctionRepoMock
  const EXPECTED_MARKETS = [
    {tokenA: 'ETH', tokenB: 'RDN'}, {tokenA: 'ETH', tokenB: 'OMG'}
  ]

  expect(await dxInfoService.getMarkets()).toEqual(EXPECTED_MARKETS)
})

test.only('It should return auction index', async () => {
  const { dxInfoService } = await setupPromise

  dxInfoService._auctionRepo = auctionRepoMock
  const EXPECTED_MARKETS = [
    {tokenA: 'ETH', tokenB: 'RDN'}, {tokenA: 'ETH', tokenB: 'OMG'}
  ]

  expect(await dxInfoService.getMarkets()).toEqual(EXPECTED_MARKETS)
})

test('It should return market details', async () => {
  const { dxInfoService } = await setupPromise

  dxInfoService._auctionRepo = auctionRepoMock

  expect(await dxInfoService.getMarketDetails({ sellToken: 'RDN', buyToken: 'ETH' })).toBe('')
})

test('It should return auction details', async () => {
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

// test('Get current auction price for two tokens', async () => {
// const { dxInfoService } = await setupPromise
//
//   expect(await dxInfoService.getCurrentPrice({sellToken: 'RDN', buyToken: 'ETH'})).toBe('')
// })

// test('Get balances for all currencies of an account', async () => {
// const { dxInfoService } = await setupPromise
//
//   expect(await dxInfoService.getBalances({address: '0xAbasdlkjasdkljg231lkjmn123'})).toBe('')
// })
