const ExchangePriceRepoKraken = require('../../../src/repositories/ExchangePriceRepo/ExchangePriceRepoKraken')
const exchangePriceRepo = new ExchangePriceRepoKraken({})

test.skip('test known Crypto changes', async () => {
  expect.assertions(3)
  expect(await exchangePriceRepo.getPrice({tokenA: 'ETH', tokenB: 'XBT'})).toMatch(/\d*\.?\d+/)
  expect(await exchangePriceRepo.getPrice({tokenA: 'ETH', tokenB: 'USD'})).toMatch(/\d*\.?\d+/)
  expect(await exchangePriceRepo.getPrice({tokenA: 'XDG', tokenB: 'XBT'})).toMatch(/\d*\.?\d+/)
})

test.skip('test unknown Crypto changes', async () => {
  expect.assertions(1)
  try {
    await exchangePriceRepo.getPrice({tokenA: 'XBT', tokenB: 'OMG'})
  } catch (e) {
    expect(e).toEqual(Error('Query:Unknown asset pair'))
  }
})
