const testSetup = require('../helpers/testSetup')

test('Get current auction info for two tokens', async () => {
  const { apiService } = await testSetup()

  expect(await apiService.getAuctions({currencyA: 'RDN', currencyB: 'ETH'})).toBe('')
})

// test('Get current auction price for two tokens', async () => {
//   const { apiService } = await testSetup()
//
//   expect(await apiService.getCurrentPrice({sellToken: 'RDN', buyToken: 'ETH'})).toBe('')
// })

// test('Get balances for all currencies of an account', async () => {
//   const { apiService } = await testSetup()
//
//   expect(await apiService.getBalances({address: '0xAbasdlkjasdkljg231lkjmn123'})).toBe('')
// })
