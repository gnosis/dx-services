const ExchangePriceRepoKraken = require('../../../src/repositories/ExchangePriceRepo/ExchangePriceRepoKraken')
const exchangePriceRepo = new ExchangePriceRepoKraken({})

test.skip('It should return a price for known Crypto markets', async () => {
  jest.setTimeout(10000)
  expect.assertions(3)
  expect(await exchangePriceRepo.getPrice({tokenA: 'ETH', tokenB: 'XBT'})).toMatch(/\d*\.?\d+/)
  expect(await exchangePriceRepo.getPrice({tokenA: 'ETH', tokenB: 'USD'})).toMatch(/\d*\.?\d+/)
  expect(await exchangePriceRepo.getPrice({tokenA: 'XDG', tokenB: 'XBT'})).toMatch(/\d*\.?\d+/)
})

test.skip('It should throw an error for unknown Crypto markets', async () => {
  jest.setTimeout(10000)
  expect.assertions(1)
  try {
    await exchangePriceRepo.getPrice({tokenA: 'XBT', tokenB: 'OMG'})
  } catch (e) {
    expect(e).toEqual(Error('Query:Unknown asset pair'))
  }
})
