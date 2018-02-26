const testSetup = require('../helpers/testSetup')
const BigNumber = require('bignumber.js')

const setupPromise = testSetup()

let currentSnapshotId

beforeEach(async () => {
  const { ethereumClient } = await setupPromise

  currentSnapshotId = await ethereumClient.makeSnapshot()
})

afterEach(async () => {
  const { ethereumClient } = await setupPromise

  return ethereumClient.revertSnapshot(currentSnapshotId)
})

// Test to approve one token
test('should allow to approve token', async () => {
  const { auctionRepo, owner } = await setupPromise
  const getIsApprovedRDN = () => auctionRepo.isApprovedToken({
    token: 'RDN'
  })

  // GIVEN a not approved token
  let isRdnApproved = await getIsApprovedRDN()
  expect(isRdnApproved).toBeFalsy()

  // WHEN approve the token
  await auctionRepo.approveToken({
    token: 'RDN', from: owner
  })

  // THEN the token is approved
  isRdnApproved = await getIsApprovedRDN()
  expect(isRdnApproved).toBeTruthy()
})

// Add a new token pair
test('Add token pair', async () => {
  const { auctionRepo, setupTestCases } = await setupPromise

  await setupTestCases()

  expect(await auctionRepo.isApprovedMarket({ tokenA: 'RDN', tokenB: 'ETH' }))
    .toBeFalsy()

  expect(await auctionRepo.getStateInfo({sellToken: 'RDN', buyToken: 'ETH'}))
    .toEqual({'auction': null, 'auctionIndex': 0, 'auctionOpp': null, 'auctionStart': null})

  expect(await auctionRepo.getState({sellToken: 'RDN', buyToken: 'ETH'}))
    .toEqual('UNKNOWN_TOKEN_PAIR')

  await _addRdnEthTokenPair({})

  expect(await auctionRepo.getStateInfo({sellToken: 'RDN', buyToken: 'ETH'}))
    .toMatchObject(baseMarketState)

  expect(await auctionRepo.getState({sellToken: 'RDN', buyToken: 'ETH'}))
    .toEqual('WAITING_FOR_AUCTION_TO_START')

  expect(await auctionRepo.isApprovedMarket({tokenA: 'RDN', tokenB: 'ETH'}))
    .toBeTruthy()
})

// Add funds to auction
test('Add funds to auction', async () => {
  jest.setTimeout(10000)
  const { auctionRepo, user1, buySell, setupTestCases } = await setupPromise

  await setupTestCases()

  expect(await auctionRepo.isApprovedMarket({ tokenA: 'RDN', tokenB: 'ETH' }))
    .toBeFalsy()

  expect(await auctionRepo.getState({ sellToken: 'RDN', buyToken: 'ETH' }))
    .toEqual('UNKNOWN_TOKEN_PAIR')

  await _addRdnEthTokenPair({})

  await buySell('postSellOrder', {
    from: user1,
    sellToken: 'RDN',
    buyToken: 'ETH',
    amount: parseFloat('2')
  })

  let updatedAuction = Object.assign({}, baseMarketState.auction,
    { sellVolume: new BigNumber('1990000000000000000') })
  expect(await auctionRepo.getStateInfo({ sellToken: 'RDN', buyToken: 'ETH' }))
    .toMatchObject(Object.assign(
      {}, baseMarketState, { auction: updatedAuction })
    )
  expect(await auctionRepo.getState({ sellToken: 'RDN', buyToken: 'ETH' }))
    .toEqual('WAITING_FOR_AUCTION_TO_START')

  expect(await auctionRepo.isApprovedMarket({ tokenA: 'RDN', tokenB: 'ETH' }))
    .toBeTruthy()
})

// Test buy tokens in auction
test('Buy in auction', async () => {
  jest.setTimeout(10000)
  const { auctionRepo, user1, buySell, setupTestCases, ethereumClient } = await setupPromise

  await setupTestCases()

  expect(await auctionRepo.isApprovedMarket({ tokenA: 'RDN', tokenB: 'ETH' }))
    .toBeFalsy()

  expect(await auctionRepo.getState({ sellToken: 'RDN', buyToken: 'ETH' }))
    .toEqual('UNKNOWN_TOKEN_PAIR')

  await _addRdnEthTokenPair({})

  expect(await auctionRepo.getState({ sellToken: 'RDN', buyToken: 'ETH' }))
    .toEqual('WAITING_FOR_AUCTION_TO_START')

  expect(await auctionRepo.getState({ sellToken: 'ETH', buyToken: 'RDN' }))
    .toEqual('WAITING_FOR_AUCTION_TO_START')

  // console.log(await ethereumClient.geLastBlockTime())
  await ethereumClient.increaseTime(6.1 * 60 * 60)
  // console.log(await ethereumClient.geLastBlockTime())

  expect(await auctionRepo.getState({ sellToken: 'RDN', buyToken: 'ETH' }))
    .toEqual('RUNNING')

  expect(await auctionRepo.getState({ sellToken: 'ETH', buyToken: 'RDN' }))
    .toEqual('RUNNING')

  await buySell('postBuyOrder', {
    from: user1,
    sellToken: 'ETH',
    buyToken: 'RDN',
    amount: parseFloat('0.5')
  })

  let updatedAuctionOpp = Object.assign({}, baseMarketState.auctionOpp,
    { buyVolume: new BigNumber('497500000000000000') })
  expect(await auctionRepo.getStateInfo({ sellToken: 'RDN', buyToken: 'ETH' }))
    .toMatchObject(Object.assign(
      {}, baseMarketState, { auctionOpp: updatedAuctionOpp })
    )
})

// Test auction closing
test('Auction closing by all sold', async () => {
  jest.setTimeout(10000)
  const { auctionRepo, user1, buySell, setupTestCases, ethereumClient } = await setupPromise

  await setupTestCases()

  expect(await auctionRepo.isApprovedMarket({ tokenA: 'RDN', tokenB: 'ETH' }))
    .toBeFalsy()

  expect(await auctionRepo.getState({ sellToken: 'RDN', buyToken: 'ETH' }))
    .toEqual('UNKNOWN_TOKEN_PAIR')

  await _addRdnEthTokenPair({rdnFunding: 0.5})

  expect(await auctionRepo.getState({ sellToken: 'RDN', buyToken: 'ETH' }))
    .toEqual('WAITING_FOR_AUCTION_TO_START')

  // console.log(await ethereumClient.geLastBlockTime())
  await ethereumClient.increaseTime(6.1 * 60 * 60)
  // console.log(await ethereumClient.geLastBlockTime())

  expect(await auctionRepo.getState({ sellToken: 'RDN', buyToken: 'ETH' }))
    .toEqual('RUNNING')

  await buySell('postBuyOrder', {
    from: user1,
    sellToken: 'RDN',
    buyToken: 'ETH',
    amount: parseFloat('0.5')
  })

  let updatedAuction = Object.assign({}, // baseMarketState.auction,
    {
      buyVolume: new BigNumber('4018084907660346'),
      closingPrice: {
        numerator: new BigNumber('4018084907660346'),
        denominator: new BigNumber('498750000000000000')
      },
      isClosed: true,
      isTheoreticalClosed: true,
      sellVolume: new BigNumber('498750000000000000')
    })
  let updatedAuctionOpp = Object.assign({}, baseMarketState.auctionOpp,
    {sellVolume: new BigNumber('13062834446704545454')})

  expect(await auctionRepo.getStateInfo({ sellToken: 'RDN', buyToken: 'ETH' }))
    .toMatchObject(Object.assign(
      {}, baseMarketState, { auction: updatedAuction, auctionOpp: updatedAuctionOpp })
    )

  expect(await auctionRepo.getState({ sellToken: 'RDN', buyToken: 'ETH' }))
    .toEqual('ONE_AUCTION_HAS_CLOSED')
})

// ********* Test helpers *********
const baseMarketState = {
  auctionIndex: 1,
  auction: {
    buyVolume: new BigNumber('0'),
    closingPrice: null,
    isClosed: false,
    isTheoreticalClosed: false,
    sellVolume: new BigNumber('0')
  },
  auctionOpp: {
    buyVolume: new BigNumber('0'),
    closingPrice: null,
    isClosed: false,
    isTheoreticalClosed: false,
    sellVolume: new BigNumber('13062839545454545454')
  }
}

async function _addRdnEthTokenPair ({rdnFunding = 0, ethFunding = 13.123}) {
  const { web3, auctionRepo, user1 } = await setupPromise

  await auctionRepo.addTokenPair({
    from: user1,
    tokenA: 'RDN',
    tokenAFunding: web3.toWei(rdnFunding, 'ether'),
    tokenB: 'ETH',
    tokenBFunding: web3.toWei(ethFunding, 'ether'),
    initialClosingPrice: {
      numerator: 4079,
      denominator: 1000000
    }
  })
}
