const testSetup = require('../helpers/testSetup')
const HDWalletProvider = require('../../src/helpers/HDWalletProvider')

let _setupInstance

beforeEach(async () => {
  _setupInstance = testSetup()
  // Custom configuration
  _setupInstance.setConfig({
    'SAFE_MODULE_ADDRESSES': null
  })
})

test('It should load the classic DX configuration', async () => {
  await _setupInstance.init()
  const config = _setupInstance.getConfig()
  expect(config.getDXMode()).toBe('classic')
})

test('It should load the SafeModule configuration', async () => {
  _setupInstance.setConfig({
    'SAFE_MODULE_ADDRESSES': {
      'SAFE_ADDRESS': '0x2c01003f521698f7625082077d2095a67e3c6723',
      'SAFE_COMPLETE_MODULE_CONTRACT_ADDRESS': '0xde5491f774f0cb009abcea7326342e105dbb1b2e'
    }
  })
  await _setupInstance.init()

  const config = _setupInstance.getConfig()
  expect(config.getDXMode()).toBe('safe')
})

test('It should instantiate the HDWalletProvider', async () => {
  const { ethereumClient } = await _setupInstance.init()
  const provider = await ethereumClient.getWeb3().currentProvider
  expect(provider).toBeInstanceOf(HDWalletProvider)
})
