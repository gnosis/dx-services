const testSetup = require('../helpers/testSetup')
const AuctionRepoMock = require('../../src/repositories/AuctionRepo/AuctionRepoMock')
const auctionRepoMock = new AuctionRepoMock({})

const setupPromise = testSetup()

const PRICE_RDN_ETH = 0.00361234
const PRICE_ETH_USD = 1112.00

const getPriceMock = jest.fn(({ tokenA, tokenB }) => {
  if (tokenA === 'RDN' && tokenB === 'ETH') {
    return PRICE_RDN_ETH
  } else if (tokenA === 'ETH' && tokenB === 'USD') {
    return PRICE_ETH_USD
  }
  throw Error('Unknown mock tokens. tokenA=' + tokenA + ', tokenB=' + tokenB)
})

const postSellOrderMock = jest.fn(() => {

})

const getAuctionIndexMock = jest.fn(({ sellToken, buyToken }) => {
  return auctionRepoMock.getAuctionIndex({ sellToken, buyToken })
})

const getAuctionStartMock = jest.fn(({ sellToken, buyToken }) => {
  return auctionRepoMock.getAuctionStart({ sellToken, buyToken })
})

const getFundingInUSDMock = jest.fn()

const getPriceFromUSDInTokensMock = jest.fn()

test.skip('If both auctions are closed, and not enough liquidity. We buy the missing', async () => {
  const { botService } = await setupPromise

  // we mock the auction repo
  botService._auctionRepo = {
    getPrice: getPriceMock
  }

  // TODO: real impl, this is just an example on how to mock the repo
  const price = await botService.testToDelete({ tokenA: 'RDN', tokenB: 'ETH' })
  expect(price).toBe(PRICE_RDN_ETH)
})

test.skip('It should ensureSellLiquidity', async () => {
  const { botService } = await setupPromise

  // we mock the auction repo
  botService._auctionRepo = {
    getPrice: getPriceMock,
    getAuctionIndex: getAuctionIndexMock,
    getAuctionStart: getAuctionStartMock,
    getFundingInUSD: getFundingInUSDMock,
    getPriceFromUSDInTokens: getPriceFromUSDInTokensMock,
    postSellOrder: postSellOrderMock
  }
})

test('It should not ensure liquidity if auction is not waiting for funding', async () => {
  const { botService } = await setupPromise

  // we mock the auction repo
  botService._auctionRepo = auctionRepoMock

  expect(await botService.ensureSellLiquidity({ sellToken: 'RDN', buyToken: 'ETH', from: '0x123' }))
    .toBeNull()
})

test('It should not ensure liquidity if auction has enougth funds', async () => {
  const { botService } = await setupPromise
  expect.assertions(1)

  // we mock the auction repo
  botService._auctionRepo = auctionRepoMock

  try {
    await botService.ensureSellLiquidity({ sellToken: 'OMG', buyToken: 'ETH', from: '0x123' })
  } catch (e) {
    expect(e).toBeInstanceOf(Error)
  }
})
