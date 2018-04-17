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
    {tokenA: 'WETH', tokenB: 'RDN'}, {tokenA: 'WETH', tokenB: 'OMG'}
  ]

  expect(await dxInfoService.getMarkets()).toEqual(EXPECTED_MARKETS)
})

test('It should return auction index', async () => {
  const { dxInfoService } = await setupPromise

  dxInfoService._auctionRepo = auctionRepoMock

  let rdnEthAuctionIndex = await dxInfoService.getAuctionIndex({
    sellToken: 'RDN', buyToken: 'WETH' })
  expect(rdnEthAuctionIndex).toBe(77)
})

test('It should return market details', async () => {
  const { dxInfoService } = await setupPromise

  dxInfoService._auctionRepo = auctionRepoMock

  let rdnEthMarketDetails = await dxInfoService.getMarketDetails({
    sellToken: 'RDN', buyToken: 'WETH' })
  expect(rdnEthMarketDetails).toMatchObject(EXPECTED_RDN_WETH_MARKET)
})

test('It should return current auction price', async () => {
  const { dxInfoService } = await setupPromise

  dxInfoService._auctionRepo = auctionRepoMock

  // Service returns a computed value of numerator.div(denominator)
  // Mock values are 10 / 233
  const RDN_WETH_CURRENT_PRICE = new BigNumber('0.0429184549356223176')

  let rdnEthCurrentPrice = await dxInfoService.getCurrentPrice({
    sellToken: 'RDN', buyToken: 'WETH' })
  expect(rdnEthCurrentPrice).toEqual(RDN_WETH_CURRENT_PRICE)
})

test('Get balances for all currencies of an account', async () => {
  const { dxInfoService } = await setupPromise

  dxInfoService._auctionRepo = auctionRepoMock

  const EXPECTED_ACCOUNT_BALANCES = [
    {amount: new BigNumber('3.44716e18'), token: 'WETH'},
    {amount: new BigNumber('517.345e18'), token: 'RDN'},
    {amount: new BigNumber('267.345e18'), token: 'OMG'}
  ]

  let accountBalance = await dxInfoService.getBalances({
    address: '0x424a46612794dbb8000194937834250Dc723fFa5' })
  expect(accountBalance).toEqual(EXPECTED_ACCOUNT_BALANCES)
})

const RDN_WETH_AUCTION = auctionsMockData.auctions['RDN-WETH']

const WETH_RDN_AUCTION = auctionsMockData.auctions['WETH-RDN']

const EXPECTED_RDN_WETH_MARKET = {
  auction: {
    buyVolume: RDN_WETH_AUCTION.buyVolume,
    closingPrice: {},
    isClosed: false,
    isTheoreticalClosed: false,
    sellVolume: RDN_WETH_AUCTION.sellVolume
  },
  auctionOpp: {
    buyVolume: WETH_RDN_AUCTION.buyVolume,
    closingPrice: {},
    isClosed: false,
    isTheoreticalClosed: false,
    sellVolume: WETH_RDN_AUCTION.sellVolume
  },
  isApprovedMarket: true,
  state: 'RUNNING',
  isSellTokenApproved: true,
  isBuyTokenApproved: true,
  auctionIndex: RDN_WETH_AUCTION.index
}
