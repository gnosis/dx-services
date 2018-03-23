const ExchangePriceRepoHuobi = require('../../../src/repositories/ExchangePriceRepo/ExchangePriceRepoHuobi')
const exchangePriceRepo = new ExchangePriceRepoHuobi({})

// class HTTPError extends Error {}

test('It should return a price for known Crypto markets', async () => {
  jest.setTimeout(10000)
  expect.assertions(2)
  expect(await exchangePriceRepo.getPrice({tokenA: 'RDN', tokenB: 'ETH'})).toMatch(/\d*\.?\d+/)
  expect(await exchangePriceRepo.getPrice({tokenA: 'OMG', tokenB: 'ETH'})).toMatch(/\d*\.?\d+/)
})

test('It should throw an error for unknown Crypto markets', async () => {
  expect.assertions(1)
  try {
    await exchangePriceRepo.getPrice({tokenA: 'XBT', tokenB: 'OMG'})
  } catch (e) {
    expect(e).toEqual(new Error('No matching markets in Huobi: XBT-OMG'))
  }
})
