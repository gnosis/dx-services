const testSetup = require('../helpers/testSetup')
const HDWalletSafeProvider = require('../../src/helpers/HDWalletSafeProvider')

test('It should instantiate the HDWalletSafeProvider', async () => {
  const _setupInstance = testSetup()
  _setupInstance.setConfig({
    'SAFE_MODULE_ADDRESSES': {
      'SAFE_ADDRESS': '0x2c01003f521698f7625082077d2095a67e3c6723',
      'SAFE_COMPLETE_MODULE_CONTRACT_ADDRESS': '0xde5491f774f0cb009abcea7326342e105dbb1b2e'
    }
  })
  const { ethereumClient } = await _setupInstance.init()
  const provider = await ethereumClient.getWeb3().currentProvider

  expect(provider).toBeInstanceOf(HDWalletSafeProvider)
})
