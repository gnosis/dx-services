const ExchangePriceRepoKraken = require('../../../src/repositories/ExchangePriceRepo/ExchangePriceRepoKraken')

const exchangePriceRepo = new ExchangePriceRepoKraken({
  timeout: 10000
})
exchangePriceRepo.getPrice({
  tokenA: 'ETH',
  tokenB: 'XBT'
})
  .then(console.log)
  .catch(console.error)
