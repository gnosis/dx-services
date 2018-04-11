const ENVIRONMENT = 'dev'

// TODO: The env var MARKETS was disabled so in DEV they don't override it
// we should uncoment it
const MARKETS = [
  { tokenA: 'ETH', tokenB: 'RDN' }
]

// To be set using env vars
const RDN_TOKEN_ADDRESS = null
const OMG_TOKEN_ADDRESS = null

module.exports = {
  ENVIRONMENT,
  MARKETS,

  // CONTRACTS
  RDN_TOKEN_ADDRESS,
  OMG_TOKEN_ADDRESS
}
