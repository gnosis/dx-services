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

test('It should return market details', async () => {
  const { dxInfoService } = await setupPromise

  dxInfoService._auctionRepo = auctionRepoMock

  let rdnEthMarketDetails = await dxInfoService.getMarketDetails({
    sellToken: 'RDN', buyToken: 'ETH' })
  expect(rdnEthMarketDetails).toMatchObject(EXPECTED_RDN_ETH_MARKET)
})

test('It should return auction details', async () => {
  const { dxInfoService } = await setupPromise

  dxInfoService._auctionRepo = auctionRepoMock

  let rdnEthAuctions = await dxInfoService.getAuctions({
    currencyA: 'RDN', currencyB: 'ETH' })
  expect(rdnEthAuctions).toMatchObject(EXPECTED_RDN_ETH_AUCTIONS)
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

const RDN_ETH_AUCTION = auctionsMockData.auctions['RDN-ETH']

const EXPECTED_RDN_ETH_MARKET = {
  auction: {
    buyVolume: RDN_ETH_AUCTION.buyVolume,
    closingPrice: null,
    isClosed: false,
    isTheoreticalClosed: false,
    sellVolume: RDN_ETH_AUCTION.sellVolume
  },
  auctionOpp: {
    buyVolume: new BigNumber(0),
    closingPrice: null,
    isClosed: false,
    isTheoreticalClosed: false,
    sellVolume: new BigNumber('0.2894321e18')
  },
  isApprovedMarket: true,
  state: 'RUNNING',
  isSellTokenApproved: true,
  isBuyTokenApproved: true,
  auctionIndex: RDN_ETH_AUCTION.index
}

const EXPECTED_RDN_ETH_AUCTIONS = {
  auctionIndex: RDN_ETH_AUCTION.index,
  auctionInfo: {
    auctionIndex: RDN_ETH_AUCTION.index,
    auction: {
      buyVolume: RDN_ETH_AUCTION.buyVolume,
      closingPrice: null,
      isClosed: false,
      isTheoreticalClosed: false,
      sellVolume: RDN_ETH_AUCTION.sellVolume
    },
    auctionOpp: {}
  },
  // buyVolume: RDN_ETH_AUCTION.buyVolume,
  currencyA: 'RDN',
  currencyB: 'ETH',
  isAuctionRunning: true,
  sellVolume: RDN_ETH_AUCTION.sellVolume,
  sellVolumeNext: RDN_ETH_AUCTION.sellVolumeNext
}
