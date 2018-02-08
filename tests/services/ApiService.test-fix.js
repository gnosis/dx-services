const testSetup = require('../helpers/testSetup')

const setupPromise = testSetup()

test('Get current auction info for two tokens', async () => {
  const { apiService } = await setupPromise

  expect(await apiService.getAuctions({currencyA: 'RDN', currencyB: 'ETH'}))// .toBe('')
})

// test('Get current auction price for two tokens', async () => {
// const { apiService } = await setupPromise
//
//   expect(await apiService.getCurrentPrice({sellToken: 'RDN', buyToken: 'ETH'})).toBe('')
// })

// test('Get balances for all currencies of an account', async () => {
// const { apiService } = await setupPromise
//
//   expect(await apiService.getBalances({address: '0xAbasdlkjasdkljg231lkjmn123'})).toBe('')
// })
