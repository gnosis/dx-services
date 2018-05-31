const ENVIRONMENT = 'dev'

// TODO: The env var MARKETS was disabled so in DEV they don't override it
// we should uncoment it
const MARKETS = [
  { tokenA: 'WETH', tokenB: 'RDN' },
  { tokenA: 'WETH', tokenB: 'OMG' }
]

const SLACK_CHANNEL_DX_BOTS = 'GA5J9F13J'

module.exports = {
  ENVIRONMENT,
  MARKETS,

  SLACK_CHANNEL_DX_BOTS
}
