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

test('Get balances for all currencies of an account', async () => {
  const { dxInfoService } = await setupPromise

  dxInfoService._auctionRepo = auctionRepoMock

  const EXPECTED_ACCOUNT_BALANCES = [
    {amount: new BigNumber('3.44716e18'), token: 'ETH'},
    {amount: new BigNumber('517.345e18'), token: 'RDN'},
    {amount: new BigNumber('267.345e18'), token: 'OMG'}
  ]

  let accountBalance = await dxInfoService.getBalances({
    address: '0x424a46612794dbb8000194937834250Dc723fFa5' })
  expect(accountBalance).toEqual(EXPECTED_ACCOUNT_BALANCES)
})

const RDN_ETH_AUCTION = auctionsMockData.auctions['RDN-ETH']

const ETH_RDN_AUCTION = auctionsMockData.auctions['ETH-RDN']

const EXPECTED_RDN_ETH_MARKET = {
  auction: {
    buyVolume: RDN_ETH_AUCTION.buyVolume,
    closingPrice: {},
    isClosed: false,
    isTheoreticalClosed: false,
    sellVolume: RDN_ETH_AUCTION.sellVolume
  },
  auctionOpp: {
    buyVolume: ETH_RDN_AUCTION.buyVolume,
    closingPrice: {},
    isClosed: false,
    isTheoreticalClosed: false,
    sellVolume: ETH_RDN_AUCTION.sellVolume
  },
  isApprovedMarket: true,
  state: 'RUNNING',
  isSellTokenApproved: true,
  isBuyTokenApproved: true,
  auctionIndex: RDN_ETH_AUCTION.index
}
