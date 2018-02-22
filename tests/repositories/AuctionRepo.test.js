const testSetup = require('../helpers/testSetup')

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

  // expect(await auctionRepo.getBalances({address: user1})).toEqual([
  //   {'amount': '5000000000000000000', 'token': 'GNO'},
  //   {'amount': '15000000000000000000', 'token': 'ETH'},
  //   {'amount': '0', 'token': 'TUL'},
  //   {'amount': '6000000000000000000', 'token': 'OWL'},
  //   {'amount': '10000000000000000000', 'token': 'RDN'},
  //   {'amount': '20000000000000000000', 'token': 'OMG'}
  // ])

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

  // await buySell('postSellOrder', {
  //   from: user1,
  //   sellToken: 'RDN',
  //   buyToken: 'ETH',
  //   amount: parseFloat('2')
  // })

  // expect(await auctionRepo.getStateInfo({sellToken: 'RDN', buyToken: 'ETH'})).toEqual({
  //   'auctionIndex': 1,
  //   'auction': {'buyVolume': '0', 'closingPrice': null, 'isClosed': false, 'isTheoreticalClosed': false, 'sellVolume': '0'},
  //   'auctionOpp': {'buyVolume': '0', 'closingPrice': null, 'isClosed': false, 'isTheoreticalClosed': false, 'sellVolume': '13062839545454545454'},
  //   'auctionStart': new Date('2018-02-22T17:01:39.000Z')
  // })
  expect(await auctionRepo.getState({sellToken: 'RDN', buyToken: 'ETH'})).toEqual(
    'WAITING_FOR_AUCTION_TO_START'
  )

  expect(await auctionRepo.isApprovedMarket({tokenA: 'RDN', tokenB: 'ETH'})).toBeTruthy()
})

// test('Retrieve raw auction state info', async () => {
//   const {addTokens, auctionRepo, owner} = await setupPromise
//   expect()
//   expect(await auctionRepo.getStateInfo({buyToken: 'RDN', sellToken: 'ETH'})).toEqual(
//     {'auction': null, 'auctionIndex': 0, 'auctionOpp': null, 'auctionStart': null}
//   )
//   await auctionRepo.approveToken({ token: 'ETH', from: owner })
//   await auctionRepo.approveToken({ token: 'RDN', from: owner })
//
//   // await addTokens()
//   expect(await auctionRepo.getStateInfo({buyToken: 'RDN', sellToken: 'ETH'})).toBe('')
// })
