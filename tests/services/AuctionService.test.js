const {
  auctionService
} = require('../../src/helpers/instanceFactory')

test ('ensureSellLiquidity throws not implemented', () => {
  expect (() => { // Wrap the code to catch the exception
    auctionService.ensureSellLiquidity({
      tokenA: 'RDN',
      tokenB: 'ETH'
    })
  })// .toThrow('Not implemented yet')
})
