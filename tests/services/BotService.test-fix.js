const testSetup = require('../helpers/testSetup')

const PRICE_RDN_ETH = 0.00361234
const PRICE_ETH_USD = 1112.00

const getPriceMock = jest.fn(({ tokenA, tokenB }) => {
  if (tokenA === 'RDN' && tokenB === 'ETH') {
    return PRICE_RDN_ETH;
  } else if (tokenA === 'ETH' && tokenB === 'USD') {
    return PRICE_ETH_USD;
  }
  throw Error('Unknown mock tockens. tokenA=' + tokenA + ', tokenB=' + tokenB)
})


test("If both auctions are closed, and not enough liquidity. We buy the missing", async () => {
  const { botService } = await testSetup()

  // we mock the auction repo
  botService._auctionRepo = {
    getPrice: getPriceMock
  }

  // TODO: real impl, this is just an example on how to mock the repo
  const price = await botService.testToDelete({ tokenA: 'RDN', tokenB: 'ETH' })
  expect(price).toBe(PRICE_RDN_ETH)

})
