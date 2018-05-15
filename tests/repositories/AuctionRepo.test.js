const debug = require('debug')('tests:repositories:AuctionRepo')

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

test('It should return the fee ratio', async () => {
  const { user1, auctionRepo } = await setupPromise
  // GIVEN a base setupTest

  // WHEN we ask for the account fee ratio
  let feeRatio = await auctionRepo.getFeeRatio({ address: user1 })

  // THEN the fee ratio matches MAXIMUM_DX_FEE
  expect(feeRatio).toEqual(MAXIMUM_DX_FEE)
})

describe('Market interacting tests', async () => {
  let beforeSetupState

  beforeAll(async () => {
    const { fundUser1, ethereumClient } = await setupPromise

    beforeSetupState = await ethereumClient.makeSnapshot()
    // Avoid seting up test cases for each test
    await fundUser1()
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
    debug('Launching \'It should allow to add a new token pair\'')
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
    rdnEthState = await _getState({ sellToken: 'WETH', buyToken: 'RDN' })
    expect(rdnEthState).toEqual('WAITING_FOR_AUCTION_TO_START')

    // THEN the market is now approved
    isRdnEthApproved = await _getIsApprovedMarket({})
    expect(isRdnEthApproved).toBeTruthy()
  })

  // Add funds to auction (sell tokens in auction)
  test('It should allow to add funds to an auction', async () => {
    debug('Launching \'It should allow to add funds to an auction\'')
    const { user1 } = await setupPromise

    // GIVEN a new token pair
    await _addRdnEthTokenPair({})

    // WHEN we add a new sell token order
    await _buySell('postSellOrder', {
      from: user1,
      sellToken: 'RDN',
      buyToken: 'WETH',
      amount: parseFloat('2')
    })

    // THEN the new state matches the intial market state,
    // but with sellVolume != 0 for RDN-WETH
    let updatedAuction = Object.assign({}, INITIAL_MARKET_STATE.auction,
      { sellVolume: {} })
    let updatedMarket = Object.assign({}, INITIAL_MARKET_STATE,
      { auction: updatedAuction })
    let rdnEthstateInfo = await _getStateInfo({})
    expect(rdnEthstateInfo).toMatchObject(updatedMarket)
    expect(_isValidSellVolume(rdnEthstateInfo.auction.sellVolume, await _toBigNumberWei(2)))
      .toBeTruthy()
    expect(_isValidSellVolume(rdnEthstateInfo.auctionOpp.sellVolume, await _toBigNumberWei(13.123)))
      .toBeTruthy()
  })

  // Test buy tokens in auction
  test('It should allow to buy tokens in an auction', async () => {
    const { user1, ethereumClient } = await setupPromise

    // GIVEN a new token pair after 6 hours of funding
    await _addRdnEthTokenPair({})
    await ethereumClient.increaseTime(6.1 * 60 * 60)

    const [
      rdnEthState,
      ethRdnState
    ] = await Promise.all([
      _getState({}),
      _getState({ sellToken: 'WETH', buyToken: 'RDN' })
    ])
    // GIVEN a state status of RUNNING
    expect(rdnEthState).toEqual('RUNNING')

    // GIVEN a state status of RUNNING
    // for oposite market too
    expect(ethRdnState).toEqual('RUNNING')

    // WHEN we add a buy order
    await _buySell('postBuyOrder', {
      from: user1,
      sellToken: 'WETH',
      buyToken: 'RDN',
      amount: parseFloat('0.5')
    })

    // THEN the new state matches the intial market state
    let updatedAuction = Object.assign({}, INITIAL_MARKET_STATE.auction,
      { isClosed: true })
    let updatedAuctionOpp = Object.assign({}, INITIAL_MARKET_STATE.auctionOpp,
      { buyVolume: {} })
    let updatedMarket = Object.assign({}, INITIAL_MARKET_STATE,
      { auction: updatedAuction, auctionOpp: updatedAuctionOpp })
    let rdnEthstateInfo = await _getStateInfo({})
    expect(rdnEthstateInfo).toMatchObject(updatedMarket)
    expect(_isValidBuyVolume(rdnEthstateInfo.auctionOpp.buyVolume, rdnEthstateInfo.auctionOpp.sellVolume))
      .toBeTruthy()
    expect(_isValidSellVolume(rdnEthstateInfo.auctionOpp.sellVolume, await _toBigNumberWei(13.123)))
      .toBeTruthy()
  })

  // Test auction closing
  test('It should close auction after all tokens sold', async () => {
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
      buyToken: 'WETH',
      amount: parseFloat('0.5')
    })

    // THEN the new state matches that one auction has closed, with a closing price
    // let price = await _getCurrentAuctionPrice({})
    let updatedAuction = {
      // TODO check correct price
      // closingPrice: {
      //   numerator: price.numerator,
      //   denominator: new BigNumber('498750000000000000')
      // },
      isClosed: true,
      isTheoreticalClosed: true
    }
    let updatedAuctionOpp = Object.assign({}, INITIAL_MARKET_STATE.auctionOpp,
      {sellVolume: {}})
    let updatedMarket = Object.assign({}, INITIAL_MARKET_STATE,
      { auction: updatedAuction, auctionOpp: updatedAuctionOpp })
    let rdnEthstateInfo = await _getStateInfo({})
    expect(rdnEthstateInfo).toMatchObject(updatedMarket)
    expect(_isValidBuyVolume(rdnEthstateInfo.auction.buyVolume, rdnEthstateInfo.auction.sellVolume))
      .toBeTruthy()
    expect(_isValidSellVolume(rdnEthstateInfo.auction.sellVolume, await _toBigNumberWei(0.5)))
      .toBeTruthy()
    expect(_isValidSellVolume(rdnEthstateInfo.auctionOpp.sellVolume, await _toBigNumberWei(13.123)))
      .toBeTruthy()

    // THEN the new state status is ONE_AUCTION_HAS_CLOSED
    rdnEthState = await _getState({})
    expect(rdnEthState).toEqual('ONE_AUCTION_HAS_CLOSED')
  })

  // Closing an auction in PENDING_CLOSE_THEORETICAL state
  test('It should allow to close a PENDING_CLOSE_THEORETICAL auction', async () => {
    const { user1, ethereumClient } = await setupPromise

    // GIVEN an auction after many tokens sold and 24 hours later
    await _addRdnEthTokenPair({ ethFunding: 10 })
    await ethereumClient.increaseTime(6.1 * 60 * 60)
    await _buySell('postBuyOrder', {
      from: user1,
      sellToken: 'WETH',
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
      sellToken: 'WETH',
      buyToken: 'RDN',
      amount: parseFloat('0')
    })

    // THEN the new state status is WAITING_FOR_FUNDING
    rdnEthState = await _getState({})
    expect(rdnEthState).toEqual('WAITING_FOR_FUNDING')
  })

  // Ask for sell volume for next auction
  test('It should add sell volume for next auction', async () => {
    const { user1, ethereumClient, auctionRepo } = await setupPromise

    // GIVEN a RUNNING auction
    await _addRdnEthTokenPair({ ethFunding: 10 })
    await ethereumClient.increaseTime(6.1 * 60 * 60)

    let sellVolumeNext = await auctionRepo.getSellVolumeNext({ sellToken: 'WETH', buyToken: 'RDN' })
    expect(sellVolumeNext).toEqual(new BigNumber('0'))

    // WHEN we add a new sell token order
    await _buySell('postSellOrder', {
      from: user1,
      sellToken: 'WETH',
      buyToken: 'RDN',
      amount: parseFloat('2')
    })

    // THEN the volume is added to the next auction
    sellVolumeNext = await auctionRepo.getSellVolumeNext({ sellToken: 'WETH', buyToken: 'RDN' })
    expect(_isValidSellVolume(sellVolumeNext, await _toBigNumberWei(2)))
      .toBeTruthy()
  })

  // Add a non ethereum market
  test.skip('It should allow to add markets between tokens different from WETH', async () => {
    jest.setTimeout(10000)
    const { web3, auctionRepo, user1 } = await setupPromise

    // GIVEN a state status of UNKNOWN_TOKEN_PAIR for RDN-WETH
    let rdnEthState = await _getState({})
    expect(rdnEthState).toEqual('UNKNOWN_TOKEN_PAIR')
    // GIVEN a state status of UNKNOWN_TOKEN_PAIR for OMG-WETH
    let omgEthState = await _getState({ sellToken: 'OMG' })
    expect(omgEthState).toEqual('UNKNOWN_TOKEN_PAIR')
    // GIVEN a state status of UNKNOWN_TOKEN_PAIR for RDN-OMG
    let rdnOmgState = await _getState({ buyToken: 'OMG' })
    expect(rdnOmgState).toEqual('UNKNOWN_TOKEN_PAIR')

    // WHEN we add WETH-RDN token pair
    await auctionRepo.addTokenPair({
      from: user1,
      tokenA: 'WETH',
      tokenAFunding: web3.toWei(10, 'ether'),
      tokenB: 'RDN',
      tokenBFunding: web3.toWei(0, 'ether'),
      initialClosingPrice: {
        numerator: 1000000,
        denominator: 4079
      }
    })

    // WHEN we add OMG-WETH token pair
    await auctionRepo.addTokenPair({
      from: user1,
      tokenA: 'OMG',
      tokenAFunding: web3.toWei(0, 'ether'),
      tokenB: 'WETH',
      tokenBFunding: web3.toWei(10, 'ether'),
      initialClosingPrice: {
        numerator: 22200,
        denominator: 1000000
      }
    })

    // WHEN we add RDN-OMG token pair
    await auctionRepo.addTokenPair({
      from: user1,
      tokenA: 'RDN',
      tokenAFunding: web3.toWei(300, 'ether'),
      tokenB: 'OMG',
      tokenBFunding: web3.toWei(500, 'ether'),
      initialClosingPrice: {
        numerator: 4079,
        denominator: 22200
      }
    })

    // THEN the new state status for RDN-WETH is WAITING_FOR_AUCTION_TO_START
    rdnEthState = await _getState({})
    expect(rdnEthState).toEqual('WAITING_FOR_AUCTION_TO_START')

    // THEN the new state status for OMG-WETH is WAITING_FOR_AUCTION_TO_START
    omgEthState = await _getState({ sellToken: 'OMG' })
    expect(omgEthState).toEqual('WAITING_FOR_AUCTION_TO_START')

    // THEN the new state status for RDN-OMG is WAITING_FOR_AUCTION_TO_START
    rdnOmgState = await _getState({ buyToken: 'OMG' })
    expect(rdnOmgState).toEqual('WAITING_FOR_AUCTION_TO_START')
  })
})

// ********* Test helpers *********
// DX Fee up to 0.5%
// The DX returns it expressed as an array of BigNumbers
const MAXIMUM_DX_FEE = [new BigNumber('1'), new BigNumber('200')]

const UNKNOWN_PAIR_MARKET_STATE = {
  'auction': null,
  'auctionIndex': 0,
  'auctionOpp': null,
  'auctionStart': null
}

const INITIAL_MARKET_STATE = {
  auctionIndex: 1,
  auction: {
    // buyVolume: new BigNumber('0'),
    closingPrice: null,
    isClosed: false,
    isTheoreticalClosed: false// ,
    // sellVolume: new BigNumber('0')
  },
  auctionOpp: {
    // buyVolume: new BigNumber('0'),
    closingPrice: null,
    isClosed: false,
    isTheoreticalClosed: false// ,
    // sellVolume: new BigNumber('13062839545454545454')
  }
}

const INITIAL_USER1_BALANCE = [
  {'amount': new BigNumber('750e18'), 'token': 'GNO'},
  {'amount': new BigNumber('20e18'), 'token': 'WETH'},
  {'amount': new BigNumber('0'), 'token': 'MGN'},
  {'amount': new BigNumber('1000e18'), 'token': 'OWL'},
  {'amount': new BigNumber('12000e18'), 'token': 'RDN'},
  {'amount': new BigNumber('1500e18'), 'token': 'OMG'}
]

async function _getIsApprovedMarket ({ tokenA = 'RDN', tokenB = 'WETH' }) {
  const { auctionRepo } = await setupPromise

  return auctionRepo.isApprovedMarket({ tokenA, tokenB })
}

async function _getStateInfo ({ sellToken = 'RDN', buyToken = 'WETH' }) {
  const { auctionRepo } = await setupPromise

  return auctionRepo.getStateInfo({ sellToken, buyToken })
}

async function _getState ({ sellToken = 'RDN', buyToken = 'WETH' }) {
  const { auctionRepo } = await setupPromise

  return auctionRepo.getState({ sellToken, buyToken })
}

async function _getCurrentAuctionPrice ({ sellToken = 'RDN', buyToken = 'WETH' }) {
  const { auctionRepo } = await setupPromise

  const auctionIndex = await auctionRepo.getAuctionIndex({
    buyToken,
    sellToken
  })

  return auctionRepo.getCurrentAuctionPrice({sellToken, buyToken, auctionIndex})
}

async function _buySell (operation, { from, buyToken, sellToken, amount }) {
  const { web3, auctionRepo } = await setupPromise

  let auctionIndex = await auctionRepo.getAuctionIndex({
    buyToken,
    sellToken
  })

  if (operation === 'postSellOrder') {
    const auctionStart = await auctionRepo.getAuctionStart({ sellToken, buyToken })
    const now = await auctionRepo._getTime()
    auctionIndex = auctionStart !== null && auctionStart <= now
      ? auctionIndex + 1
      : auctionIndex
  }

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
    tokenB: 'WETH',
    tokenBFunding: web3.toWei(ethFunding, 'ether'),
    initialClosingPrice: {
      numerator: 4079,
      denominator: 1000000
    }
  })
}

async function _toBigNumberWei (value) {
  const { web3 } = await setupPromise

  return new BigNumber(web3.toWei(value, 'ether'))
}

function _isValidBuyVolume (buyVolume, sellVolume) {
  debug('buyVolume: ', buyVolume)
  debug('sellVolume: ', sellVolume)

  return buyVolume.lessThanOrEqualTo(sellVolume)
}

function _isValidSellVolume (sellVolume, fundingSellVolume) {
  const minimumSellVolume = fundingSellVolume.mul(1 - MAXIMUM_DX_FEE[0].div(MAXIMUM_DX_FEE[1]))

  debug('minimumSellVolume: ', minimumSellVolume)
  debug('sellVolume: ', sellVolume)
  debug('originSellVolume: ', fundingSellVolume)

  return minimumSellVolume.lessThanOrEqualTo(sellVolume) &&
    sellVolume.lessThanOrEqualTo(fundingSellVolume)
}
