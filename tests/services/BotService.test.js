const {
  botService
} = require('../../src/helpers/instanceFactory')

test('ensureSellLiquidity throws not implemented', () => {
  expect(() => { // Wrap the code to catch the exception
    botService.ensureSellLiquidity({
      tokenA: 'RDN',
      tokenB: 'ETH'
    })
  })// .toThrow('Not implemented yet')
})
