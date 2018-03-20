const testSetup = require('../helpers/testSetup')

const setupPromise = testSetup()

test('Get current auction info for two tokens', async () => {
  const { dxInfoService } = await setupPromise

  expect(await dxInfoService.getAuctions({currencyA: 'RDN', currencyB: 'ETH'}))// .toBe('')
})

// test('Get current auction price for two tokens', async () => {
// const { dxInfoService } = await setupPromise
//
//   expect(await dxInfoService.getCurrentPrice({sellToken: 'RDN', buyToken: 'ETH'})).toBe('')
// })

// test('Get balances for all currencies of an account', async () => {
// const { dxInfoService } = await setupPromise
//
//   expect(await dxInfoService.getBalances({address: '0xAbasdlkjasdkljg231lkjmn123'})).toBe('')
// })
