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

test('It should allow to approve one token', async () => {
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

test('It should fail when unknow token is required', async () => {
  expect.assertions(1)
  const { auctionRepo } = await setupPromise

  const getUnknownToken = () => auctionRepo.getTokenAddress({ token: 'ABC' })
  try {
    await getUnknownToken()
  } catch (e) {
    expect(e).toBeInstanceOf(Error)
  }
})

describe('Market interacting tests', async () => {
  let beforeSetupState

  beforeAll(async () => {
    const { setupTestCases, ethereumClient } = await setupPromise

    beforeSetupState = await ethereumClient.makeSnapshot()
    // Avoid seting up test cases for each test
    await setupTestCases()
  })

  afterAll(async () => {
    const { ethereumClient } = await setupPromise

    return ethereumClient.revertSnapshot(beforeSetupState)
  })

  test('It should return account balances', async () => {
    const { user1, auctionRepo } = await setupPromise
    // GIVEN a base setupTest

    // WHEN we ask for account balance
    let userBalance = await auctionRepo.getBalances({ address: user1 })

    // THEN the user balance matches INITIAL_USER1_BALANCE
    expect(userBalance).toEqual(INITIAL_USER1_BALANCE)
  })

  test('It should allow to add a new token pair', async () => {
    // GIVEN a not approved token pair
    let isRdnEthApproved = await _getIsApprovedMarket({})
    expect(isRdnEthApproved).toBeFalsy()

    // GIVEN a initial state that shows there haven't been any previous auction
    let rdnEthstateInfo = await _getStateInfo({})
    expect(rdnEthstateInfo).toEqual(UNKNOWN_PAIR_MARKET_STATE)

    // GIVEN a state status of UNKNOWN_TOKEN_PAIR
    let rdnEthState = await _getState({})
    expect(rdnEthState).toEqual('UNKNOWN_TOKEN_PAIR')

    // WHEN we add a new token pair
    await _addRdnEthTokenPair({})

    // THEN the new state matches the intial market state
    rdnEthstateInfo = await _getStateInfo({})
    expect(rdnEthstateInfo).toMatchObject(INITIAL_MARKET_STATE)

    // THEN the new state status is WAITING_FOR_AUCTION_TO_START
    rdnEthState = await _getState({})
    expect(rdnEthState).toEqual('WAITING_FOR_AUCTION_TO_START')

    // THEN the new state status is WAITING_FOR_AUCTION_TO_START
    // for oposite market too
    rdnEthState = await _getState({ sellToken: 'ETH', buyToken: 'RDN' })
    expect(rdnEthState).toEqual('WAITING_FOR_AUCTION_TO_START')

    // THEN the market is now approved
    isRdnEthApproved = await _getIsApprovedMarket({})
    expect(isRdnEthApproved).toBeTruthy()
  })

  // Add funds to auction (sell tokens in auction)
  test('It should allow to add funds to an auction', async () => {
    const { user1 } = await setupPromise

    // GIVEN a new token pair
    await _addRdnEthTokenPair({})

    // WHEN we add a new sell token order
    await _buySell('postSellOrder', {
      from: user1,
      sellToken: 'RDN',
      buyToken: 'ETH',
      amount: parseFloat('2')
    })

    // THEN the new state matches the intial market state,
    // but with sellVolume != 0 for RDN-ETH
    let updatedAuction = Object.assign({}, INITIAL_MARKET_STATE.auction,
      { sellVolume: new BigNumber('1990000000000000000') })
    let updatedMarket = Object.assign({}, INITIAL_MARKET_STATE,
      { auction: updatedAuction })
    let rdnEthstateInfo = await _getStateInfo({})
    expect(rdnEthstateInfo).toMatchObject(updatedMarket)
  })

  // Test buy tokens in auction
  test('It should allow to buy tokens in an auction', async () => {
    const { user1, ethereumClient } = await setupPromise

    // GIVEN a new token pair after 6 hours of funding
    await _addRdnEthTokenPair({})
    await ethereumClient.increaseTime(6.1 * 60 * 60)

    // GIVEN a state status of RUNNING
    let rdnEthState = await _getState({})
    expect(rdnEthState).toEqual('RUNNING')

    // GIVEN a state status of RUNNING
    // for oposite market too
    rdnEthState = await _getState({ sellToken: 'ETH', buyToken: 'RDN' })
    expect(rdnEthState).toEqual('RUNNING')

    // WHEN we add a buy order
    await _buySell('postBuyOrder', {
      from: user1,
      sellToken: 'ETH',
      buyToken: 'RDN',
      amount: parseFloat('0.5')
    })

    // THEN the new state matches the intial market state
    let updatedAuctionOpp = Object.assign({}, INITIAL_MARKET_STATE.auctionOpp,
      { buyVolume: new BigNumber('497500000000000000') })
    let updatedMarket = Object.assign({}, INITIAL_MARKET_STATE,
      { auctionOpp: updatedAuctionOpp })
    let rdnEthstateInfo = await _getStateInfo({})
    expect(rdnEthstateInfo).toMatchObject(updatedMarket)
  })

  // Test auction closing
  test.skip('It should close auction after all tokens sold', async () => {
    jest.setTimeout(10000)
    const { user1, ethereumClient } = await setupPromise

    // GIVEN a new token pair after 6 hours of funding
    await _addRdnEthTokenPair({rdnFunding: 0.5})
    await ethereumClient.increaseTime(6.1 * 60 * 60)

    // GIVEN a state status of RUNNING
    let rdnEthState = await _getState({})
    expect(rdnEthState).toEqual('RUNNING')

    // WHEN we add a buy order for all tokens of one auction side
    await _buySell('postBuyOrder', {
      from: user1,
      sellToken: 'RDN',
      buyToken: 'ETH',
      amount: parseFloat('0.5')
    })

    // THEN the new state matches that one auction has closed, with a closing price
    let price = await _getPrice({})
    let updatedAuction = {
      buyVolume: price.numerator,
      closingPrice: {
        numerator: price.numerator,
        denominator: new BigNumber('498750000000000000')
      },
      isClosed: true,
      isTheoreticalClosed: true,
      sellVolume: new BigNumber('498750000000000000')
    }
    let updatedAuctionOpp = Object.assign({}, INITIAL_MARKET_STATE.auctionOpp,
      {sellVolume: new BigNumber('13062834446704545454')})
    let updatedMarket = Object.assign({}, INITIAL_MARKET_STATE,
      { auction: updatedAuction, auctionOpp: updatedAuctionOpp })
    let rdnEthstateInfo = await _getStateInfo({})
    expect(rdnEthstateInfo).toMatchObject(updatedMarket)

    // THEN the new state status is ONE_AUCTION_HAS_CLOSED
    rdnEthState = await _getState({})
    expect(rdnEthState).toEqual('ONE_AUCTION_HAS_CLOSED')
  })

  // Closing an auction in PENDING_CLOSE_THEORETICAL state
  test('It should allow to close a PENDING_CLOSE_THEORETICAL auction', async () => {
    jest.setTimeout(10000)
    const { user1, ethereumClient, setupTestCases } = await setupPromise
    await setupTestCases()

    // GIVEN an auction after many tokens sold and 24 hours later
    await _addRdnEthTokenPair({ ethFunding: 10 })
    await ethereumClient.increaseTime(6.1 * 60 * 60)
    await _buySell('postBuyOrder', {
      from: user1,
      sellToken: 'ETH',
      buyToken: 'RDN',
      amount: parseFloat('9')
    })
    await ethereumClient.increaseTime(24 * 60 * 60)

    // GIVEN a state status of PENDING_CLOSE_THEORETICAL
    let rdnEthState = await _getState({})
    expect(rdnEthState).toEqual('PENDING_CLOSE_THEORETICAL')

    // WHEN we add a buy order without amount
    await _buySell('postBuyOrder', {
      from: user1,
      sellToken: 'ETH',
      buyToken: 'RDN',
      amount: parseFloat('0')
    })

    // THEN the new state status is WAITING_FOR_FUNDING
    rdnEthState = await _getState({})
    expect(rdnEthState).toEqual('WAITING_FOR_FUNDING')
  })

  // Ask for sell volume for next auction
  test.skip('It should return sell volume for next auction', async () => {
    const { user1, ethereumClient, auctionRepo } = await setupPromise

    // GIVEN an auction after few tokens sold and 24 hours later
    await _addRdnEthTokenPair({ ethFunding: 10 })
    await ethereumClient.increaseTime(6.1 * 60 * 60)
    await _buySell('postBuyOrder', {
      from: user1,
      sellToken: 'ETH',
      buyToken: 'RDN',
      amount: parseFloat('3')
    })

    let sellVolumeNext = await auctionRepo.getSellVolumeNext({ sellToken: 'ETH', buyToken: 'RDN' })
    expect(sellVolumeNext).toEqual(new BigNumber('0'))

    await ethereumClient.increaseTime(24 * 60 * 60)

    // GIVEN a state status of PENDING_CLOSE_THEORETICAL
    let rdnEthState = await _getState({})
    expect(rdnEthState).toEqual('PENDING_CLOSE_THEORETICAL')
    sellVolumeNext = await auctionRepo.getSellVolumeNext({ sellToken: 'ETH', buyToken: 'RDN' })
    expect(sellVolumeNext).toEqual(new BigNumber('0'))

    // WHEN we add a buy order without amount
    await _buySell('postBuyOrder', {
      from: user1,
      sellToken: 'ETH',
      buyToken: 'RDN',
      amount: parseFloat('0')
    })
    // let rdnEthstateInfo = await _getStateInfo({})
    // expect(rdnEthstateInfo).toBe()

    // WHEN
    sellVolumeNext = await auctionRepo.getSellVolumeNext({ sellToken: 'ETH', buyToken: 'RDN' })

    // THEN
    expect(sellVolumeNext).toBe()
  })

  // Add a non ethereum market
  test.skip('It should allow to add markets between tokens different from ETH', async () => {
    jest.setTimeout(20000)
    const { web3, auctionRepo, setupTestCases, user1 } = await setupPromise

    await setupTestCases()
    await setupTestCases()

    // GIVEN a state status of UNKNOWN_TOKEN_PAIR
    let rdnEthState = await _getState({})
    expect(rdnEthState).toEqual('UNKNOWN_TOKEN_PAIR')

    // WHEN we add a token pair
    await auctionRepo.addTokenPair({
      from: user1,
      tokenA: 'ETH',
      tokenAFunding: web3.toWei(10, 'ether'),
      tokenB: 'RDN',
      tokenBFunding: web3.toWei(0, 'ether'),
      initialClosingPrice: {
        numerator: 4079,
        denominator: 1000000
      }
    })

    // THEN the new state status is WAITING_FOR_AUCTION_TO_START
    rdnEthState = await _getState({})
    expect(rdnEthState).toEqual('WAITING_FOR_AUCTION_TO_START')

    // await auctionRepo.addTokenPair({
    //   from: user1,
    //   tokenA: 'OMG',
    //   tokenAFunding: web3.toWei(0, 'ether'),
    //   tokenB: 'ETH',
    //   tokenBFunding: web3.toWei(10, 'ether'),
    //   initialClosingPrice: {
    //     numerator: 22200,
    //     denominator: 1000000
    //   }
    // })

    // await auctionRepo.addTokenPair({
    //   from: user1,
    //   tokenA: 'RDN',
    //   tokenAFunding: web3.toWei(30, 'ether'),
    //   tokenB: 'OMG',
    //   tokenBFunding: web3.toWei(30, 'ether'),
    //   initialClosingPrice: {
    //     numerator: 4079,
    //     denominator: 22200
    //   }
    // })
  })
})

// ********* Test helpers *********
const UNKNOWN_PAIR_MARKET_STATE = {
  'auction': null,
  'auctionIndex': 0,
  'auctionOpp': null,
  'auctionStart': null
}

const INITIAL_MARKET_STATE = {
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

const INITIAL_USER1_BALANCE = [
  {'amount': new BigNumber('5000000000000000000'), 'token': 'GNO'},
  {'amount': new BigNumber('15000000000000000000'), 'token': 'ETH'},
  {'amount': new BigNumber('0'), 'token': 'TUL'},
  {'amount': new BigNumber('6000000000000000000'), 'token': 'OWL'},
  {'amount': new BigNumber('10000000000000000000'), 'token': 'RDN'},
  {'amount': new BigNumber('20000000000000000000'), 'token': 'OMG'}
]

async function _getIsApprovedMarket ({ tokenA = 'RDN', tokenB = 'ETH' }) {
  const { auctionRepo } = await setupPromise

  return auctionRepo.isApprovedMarket({ tokenA, tokenB })
}

async function _getStateInfo ({ sellToken = 'RDN', buyToken = 'ETH' }) {
  const { auctionRepo } = await setupPromise

  return auctionRepo.getStateInfo({ sellToken, buyToken })
}

async function _getState ({ sellToken = 'RDN', buyToken = 'ETH' }) {
  const { auctionRepo } = await setupPromise

  return auctionRepo.getState({ sellToken, buyToken })
}

async function _getPrice ({ sellToken = 'RDN', buyToken = 'ETH' }) {
  const { auctionRepo } = await setupPromise

  const auctionIndex = await auctionRepo.getAuctionIndex({
    buyToken,
    sellToken
  })

  return auctionRepo.getPrice({sellToken, buyToken, auctionIndex})
}

async function _buySell (operation, { from, buyToken, sellToken, amount }) {
  const { web3, auctionRepo } = await setupPromise

  const auctionIndex = await auctionRepo.getAuctionIndex({
    buyToken,
    sellToken
  })

  await auctionRepo[operation]({
    from,
    buyToken,
    sellToken,
    auctionIndex,
    amount: web3.toWei(amount, 'ether')
  })
}

async function _addRdnEthTokenPair ({ rdnFunding = 0, ethFunding = 13.123 }) {
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
