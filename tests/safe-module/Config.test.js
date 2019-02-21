const testSetup = require('../helpers/testSetup')
const HDSafeWalletProvider = require('../../src/helpers/HDWalletSafeProvider')

// test('It should load the classic DX configuration', async () => {
//   await testSetup()
//   const config = _setupInstance.getConfig()
//   expect(config.getDXMode()).toBe('classic')
// })

test('It should load the SafeModule configuration', async () => {
  const { config } = await testSetup()
  expect(config.getDXMode()).toBe('safe')
})

test('It should instantiate the HDSafeWalletProvider', async () => {
  const { ethereumClient } = await testSetup()
  const provider = await ethereumClient.getWeb3().currentProvider
  expect(provider).toBeInstanceOf(HDSafeWalletProvider)
})