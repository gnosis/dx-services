const testSetup = require('../helpers/testSetup')

const setupPromise = testSetup()

test('Retrieve raw auction state info', async () => {
  const {addTokens, auctionRepo} = await setupPromise
  expect(await auctionRepo.getStateInfo({buyToken: 'RDN', sellToken: 'ETH'}))// .toBe('')
  // await addTokens()
  // expect(await auctionRepo.getStateInfo({buyToken: 'RDN', sellToken: 'ETH'})).toBe('')
})
