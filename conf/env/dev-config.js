const ENVIRONMENT = 'dev'

// TODO: The env var MARKETS was disabled so in DEV they don't override it
// we should uncoment it
const MARKETS = [
  { tokenA: 'WETH', tokenB: 'RDN' }
  //,{ tokenA: 'WETH', tokenB: 'OMG' }
]

module.exports = {
  ENVIRONMENT,
  MARKETS
}
