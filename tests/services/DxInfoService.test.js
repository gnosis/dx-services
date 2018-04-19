const testSetup = require('../helpers/testSetup')
const AuctionRepoMock = require('../../src/repositories/AuctionRepo/AuctionRepoMock')
const auctionRepoMock = new AuctionRepoMock({})
const EthereumRepoMock = require('../../src/repositories/EthereumRepo/EthereumRepoMock')
const ethereumRepoMock = new EthereumRepoMock({})

const auctionsMockData = require('../data/auctions')

const BigNumber = require('bignumber.js')

const setupPromise = testSetup()

test('It should return available markets', async () => {
  const { dxInfoService } = await setupPromise

  dxInfoService._auctionRepo = auctionRepoMock
  dxInfoService._ethereumRepo = ethereumRepoMock
  const EXPECTED_MARKETS = [{
    tokenA: { name: 'Ethereum Token', symbol: 'ETH', address: '0x123', decimals: 18 },
    tokenB: { name: 'Raiden Network Token', symbol: 'RDN', address: '0x234', decimals: 18 }
  }, {
    tokenA: { name: 'Ethereum Token', symbol: 'ETH', address: '0x123', decimals: 18 },
    tokenB: { name: 'OmiseGO', symbol: 'OMG', address: '0x345', decimals: 18 }
  }]

  expect(await dxInfoService.getMarkets()).toMatchObject(EXPECTED_MARKETS)
})

test('It should return funded tokens', async () => {
  const { dxInfoService } = await setupPromise

  dxInfoService._auctionRepo = auctionRepoMock
  dxInfoService._ethereumRepo = ethereumRepoMock
  const EXPECTED_TOKENS = [
    { name: 'Ethereum Token', symbol: 'ETH', address: '0x123', decimals: 18 },
    { name: 'Raiden Network Token', symbol: 'RDN', address: '0x234', decimals: 18 },
    { name: 'OmiseGO', symbol: 'OMG', address: '0x345', decimals: 18 }
  ]

  let fundedTokenList = await dxInfoService.getFundedTokenList()
  expect(fundedTokenList).toMatchObject(EXPECTED_TOKENS)
})

test('It should return auction state', async () => {
  const { dxInfoService } = await setupPromise

  dxInfoService._auctionRepo = auctionRepoMock

  let rdnEthAuctionState = await dxInfoService.getState({
    sellToken: 'RDN', buyToken: 'ETH' })
  expect(rdnEthAuctionState).toBe('RUNNING')
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

  // Service returns a computed value of numerator.div(denominator)
  // Mock values are 10 / 233
  const RDN_ETH_CURRENT_PRICE = new BigNumber('0.0429184549356223176')

  let rdnEthCurrentPrice = await dxInfoService.getCurrentPrice({
    sellToken: 'RDN', buyToken: 'ETH' })
  expect(rdnEthCurrentPrice).toEqual(RDN_ETH_CURRENT_PRICE)
})

test('It should return current auction start', async () => {
  const { dxInfoService } = await setupPromise

  dxInfoService._auctionRepo = auctionRepoMock

  let rdnEthAuctionStart = await dxInfoService.getAuctionStart({
    sellToken: 'RDN', buyToken: 'ETH' })
  expect(rdnEthAuctionStart).toEqual(RDN_ETH_AUCTION.auctionStart)
})

test('It should return current auction sell volume', async () => {
  const { dxInfoService } = await setupPromise

  dxInfoService._auctionRepo = auctionRepoMock

  let rdnEthSellVolume = await dxInfoService.getSellVolume({
    sellToken: 'RDN', buyToken: 'ETH' })
  expect(rdnEthSellVolume).toEqual(RDN_ETH_AUCTION.sellVolume)
})

test('It should return next auction sell volume', async () => {
  const { dxInfoService } = await setupPromise

  dxInfoService._auctionRepo = auctionRepoMock

  let rdnEthSellVolumeNext = await dxInfoService.getSellVolumeNext({
    sellToken: 'RDN', buyToken: 'ETH' })
  expect(rdnEthSellVolumeNext).toEqual(RDN_ETH_AUCTION.sellVolumeNext)
})

test('It should return current auction buy volume', async () => {
  const { dxInfoService } = await setupPromise

  dxInfoService._auctionRepo = auctionRepoMock

  let rdnEthBuyVolume = await dxInfoService.getBuyVolume({
    sellToken: 'RDN', buyToken: 'ETH' })
  expect(rdnEthBuyVolume).toEqual(RDN_ETH_AUCTION.buyVolume)
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
