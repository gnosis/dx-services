let WEB3_PROVIDER
const assert = require('assert')

// TODO: Consider using the MNEMONIC or PRIVATE_KEYS from env, and inject here
//  - more flexible (adds suport for PK)
//  - Remove it from src/helpers/web3Providers/index.js

if (process.env.SAFE_ADDRESS) {
  // Gnosis Safe Wallet Provider
  assert(process.env.SAFE_ADDRESS, 'SAFE_ADDRESS env is required')
  assert(process.env.SAFE_MODULE_ADDRESS, 'SAFE_MODULE_ADDRESS env is required')

  WEB3_PROVIDER = {
    factory: 'src/helpers/web3Providers/HDWalletSafeProvider.js',
    addressIndex: 0,
    numAddresses: 2,
    shareNonce: true,
    blockForNonceCalculation: 'pending',
    safes: [{
      operatorAddressIndex: 0,
      safeAddress: process.env.SAFE_ADDRESS,
      safeModuleType: process.env.SAFE_MODULE_TYPE,
      safeModuleAddress: process.env.SAFE_MODULE_ADDRESS
    }]
  }
} else {
  // HD Wallet Provider
  WEB3_PROVIDER = {
    factory: 'src/helpers/web3Providers/HDWalletProvider.js',
    addressIndex: 0,
    numAddresses: 2,
    shareNonce: true,
    blockForNonceCalculation: 'pending'
  }
}

module.exports = {
  WEB3_PROVIDER
}
