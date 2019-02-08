const truffleConfig = require('@gnosis.pm/util-contracts/src/util/truffleConfig')

const DEFAULT_GAS_PRICE_GWEI = 5
const GAS_LIMIT = 6.5e6
const DEFAULT_MNEMONIC =
  'candy maple cake sugar pudding cream honey rich smooth crumble sweet treat'

// Load env vars
require('dotenv').config()

// Get the mnemonic
const privateKey = process.env.PK
let mnemonic = process.env.MNEMONIC
if (!privateKey && !mnemonic) {
  mnemonic = DEFAULT_MNEMONIC
}

// TODO: Uncomment next lines once the project is migrated to truffle5
// Solidity compiler (solc) config:
// const solcUseDocker = process.env.SOLC_USE_DOCKER === 'true' || false
// const solcVersion = '0.4.25'
const compatibilityTruffle4 = true

// Gas price
const gasPriceGWei = process.env.GAS_PRICE_GWEI || DEFAULT_GAS_PRICE_GWEI

// Allow to add an aditional network (useful for docker-compose setups)
//  i.e. NETWORK='{ "name": "docker", "networkId": "99999", "url": "http://rpc:8545", "gas": "6700000", "gasPrice": "25000000000"  }'
let aditionalNetwork = process.env.NETWORK
  ? JSON.parse(process.env.NETWORK)
  : null

module.exports = truffleConfig({
  mnemonic,
  privateKey,
  gasPriceGWei,
  gas: GAS_LIMIT,
  aditionalNetwork,
  optimizedEnabled: true,
  compatibilityTruffle4
  /*
  solcUseDocker,
  solcVersion
  */
})
