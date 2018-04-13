const PriceRepoKraken = require('../../../src/repositories/PriceRepo/PriceRepoKraken')

const priceRepo = new PriceRepoKraken({
  timeout: 10000
})
priceRepo.getPrice({
  tokenA: 'ETH',
  tokenB: 'XBT'
})
  .then(console.log)
  .catch(console.error)
