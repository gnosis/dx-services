const testSetup = require('../helpers/testSetup')

test('Get curent auction info for two tokens', async () => {
  const { apiService } = await testSetup()

  expect(await apiService.getAuctions({currencyA: 'RDN', currencyB: 'ETH'})).toBe('')
})
