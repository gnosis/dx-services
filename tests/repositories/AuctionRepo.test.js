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
  // console.log('Current snapshotId to revert is : ' + currentSnapshotId)

  return ethereumClient.revertSnapshot(currentSnapshotId)
})

test('Approve token', async () => {
  const {auctionRepo, owner} = await setupPromise

  expect(await auctionRepo.isApprovedToken({ token: 'RDN' })).toBeFalsy()

  await auctionRepo.approveToken({ token: 'RDN', from: owner })

  expect(await auctionRepo.isApprovedToken({ token: 'RDN' })).toBeTruthy()
})

test('Add token pair', async () => {
  const {web3, auctionRepo, user1, buySell, setupTestCases} = await setupPromise

  await setupTestCases()

  expect(await auctionRepo.isApprovedMarket({ tokenA: 'RDN', tokenB: 'ETH' })).toBeFalsy()

  expect(await auctionRepo.getStateInfo({sellToken: 'RDN', buyToken: 'ETH'})).toEqual(
    {'auction': null, 'auctionIndex': 0, 'auctionOpp': null, 'auctionStart': null}
  )
  expect(await auctionRepo.getState({sellToken: 'RDN', buyToken: 'ETH'})).toEqual(
    'UNKNOWN_TOKEN_PAIR'
  )

  const result = await auctionRepo.addTokenPair({
    from: user1,
    tokenA: 'RDN',
    tokenAFunding: web3.toWei(0, 'ether'),
    tokenB: 'ETH',
    tokenBFunding: web3.toWei(13.123, 'ether'),
    initialClosingPrice: {
      numerator: 4079,
      denominator: 1000000
    }
  })

  expect(await auctionRepo.getStateInfo({sellToken: 'RDN', buyToken: 'ETH'})).toMatchObject({
    'auctionIndex': 1,
    'auction': {'buyVolume': new BigNumber(0), 'closingPrice': null, 'isClosed': false, 'isTheoreticalClosed': false, 'sellVolume': new BigNumber(0)},
    'auctionOpp': {'buyVolume': new BigNumber(0), 'closingPrice': null, 'isClosed': false, 'isTheoreticalClosed': false, 'sellVolume': new BigNumber('13062839545454545454')}
  })
  expect(await auctionRepo.getState({sellToken: 'RDN', buyToken: 'ETH'})).toEqual(
    'WAITING_FOR_AUCTION_TO_START'
  )

  expect(await auctionRepo.isApprovedMarket({tokenA: 'RDN', tokenB: 'ETH'})).toBeTruthy()
})

test('Add sell to auction', async () => {
  jest.setTimeout(10000)
  const {web3, auctionRepo, user1, buySell, setupTestCases} = await setupPromise

  await setupTestCases()

  expect(await auctionRepo.isApprovedMarket({ tokenA: 'RDN', tokenB: 'ETH' })).toBeFalsy()

  expect(await auctionRepo.getState({sellToken: 'RDN', buyToken: 'ETH'})).toEqual(
    'UNKNOWN_TOKEN_PAIR'
  )

  const result = await auctionRepo.addTokenPair({
    from: user1,
    tokenA: 'RDN',
    tokenAFunding: web3.toWei(0, 'ether'),
    tokenB: 'ETH',
    tokenBFunding: web3.toWei(13.123, 'ether'),
    initialClosingPrice: {
      numerator: 4079,
      denominator: 1000000
    }
  })

  await buySell('postSellOrder', {
    from: user1,
    sellToken: 'RDN',
    buyToken: 'ETH',
    amount: parseFloat('2')
  })

  expect(await auctionRepo.getStateInfo({sellToken: 'RDN', buyToken: 'ETH'})).toMatchObject({
    'auctionIndex': 1,
    'auction': {'buyVolume': new BigNumber('0'), 'closingPrice': null, 'isClosed': false, 'isTheoreticalClosed': false, 'sellVolume': new BigNumber('1990000000000000000')},
    'auctionOpp': {'buyVolume': new BigNumber('0'), 'closingPrice': null, 'isClosed': false, 'isTheoreticalClosed': false, 'sellVolume': new BigNumber('13062839545454545454')}
  })
  expect(await auctionRepo.getState({sellToken: 'RDN', buyToken: 'ETH'})).toEqual(
    'WAITING_FOR_AUCTION_TO_START'
  )

  expect(await auctionRepo.isApprovedMarket({tokenA: 'RDN', tokenB: 'ETH'})).toBeTruthy()
})

test('Buy in auction', async () => {
  jest.setTimeout(10000)
  const {web3, auctionRepo, user1, buySell, setupTestCases, ethereumClient} = await setupPromise

  await setupTestCases()

  expect(await auctionRepo.isApprovedMarket({ tokenA: 'RDN', tokenB: 'ETH' })).toBeFalsy()

  expect(await auctionRepo.getState({sellToken: 'RDN', buyToken: 'ETH'})).toEqual(
    'UNKNOWN_TOKEN_PAIR'
  )

  const result = await auctionRepo.addTokenPair({
    from: user1,
    tokenA: 'RDN',
    tokenAFunding: web3.toWei(0, 'ether'),
    tokenB: 'ETH',
    tokenBFunding: web3.toWei(13.123, 'ether'),
    initialClosingPrice: {
      numerator: 4079,
      denominator: 1000000
    }
  })

  expect(await auctionRepo.getState({sellToken: 'RDN', buyToken: 'ETH'})).toEqual(
    'WAITING_FOR_AUCTION_TO_START'
  )
  expect(await auctionRepo.getState({sellToken: 'ETH', buyToken: 'RDN'})).toEqual(
    'WAITING_FOR_AUCTION_TO_START'
  )

  // console.log(await ethereumClient.geLastBlockTime())
  await ethereumClient.increaseTime(6.1 * 60 * 60)
  // console.log(await ethereumClient.geLastBlockTime())

  expect(await auctionRepo.getState({sellToken: 'RDN', buyToken: 'ETH'})).toEqual(
    'RUNNING'
  )
  expect(await auctionRepo.getState({sellToken: 'ETH', buyToken: 'RDN'})).toEqual(
    'RUNNING'
  )

  await buySell('postBuyOrder', {
    from: user1,
    sellToken: 'ETH',
    buyToken: 'RDN',
    amount: parseFloat('0.5')
  })

  expect(await auctionRepo.getStateInfo({sellToken: 'RDN', buyToken: 'ETH'})).toMatchObject({
    'auctionIndex': 1,
    'auction': {'buyVolume': new BigNumber('0'), 'closingPrice': null, 'isClosed': false, 'isTheoreticalClosed': false, 'sellVolume': new BigNumber('0')},
    'auctionOpp': {'buyVolume': new BigNumber('497500000000000000'), 'closingPrice': null, 'isClosed': false, 'isTheoreticalClosed': false, 'sellVolume': new BigNumber('13062839545454545454')}
  })
})
