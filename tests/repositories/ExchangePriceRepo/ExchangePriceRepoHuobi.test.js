const ExchangePriceRepoHuobi = require('../../../src/repositories/ExchangePriceRepo/ExchangePriceRepoHuobi')
const exchangePriceRepo = new ExchangePriceRepoHuobi()
test('test known Crypto changes', async () => {
  expect.assertions(3)
  expect(await exchangePriceRepo.getPrice({tokenA: 'RDN', tokenB: 'ETH'})).toMatch(/\d*\.?\d+/)
  expect(await exchangePriceRepo.getPrice({tokenA: 'OMG', tokenB: 'ETH'})).toMatch(/\d*\.?\d+/)
  expect(await exchangePriceRepo.getPrice({tokenA: 'ETH', tokenB: 'BTC'})).toMatch(/\d*\.?\d+/)
})

test('test unknown Crypto changes', async () => {
  expect.assertions(1)
  try {
    await exchangePriceRepo.getPrice({tokenA: 'XBT', tokenB: 'OMG'})
  } catch (e) {
    expect(e).toEqual(Error('Query:Unknown asset pair'))
  }
})
