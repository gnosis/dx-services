const ENVIRONMENT = 'dev'

// TODO: The env var MARKETS was disabled so in DEV they don't override it
// we should uncoment it
const MARKETS = [
  { tokenA: 'ETH', tokenB: 'RDN' }
]

module.exports = {
  ENVIRONMENT,
  MARKETS
}
