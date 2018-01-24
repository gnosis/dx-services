const {
  auctionService
} = require('../../src/helpers/instanceFactory')

test('ensureSellLiquidity throws not implemented', () => {
  expect(() => { // Wrap the code to catch the exception
    auctionService.ensureSellLiquidity()
  }).toThrow('Not implemented yet')
})
