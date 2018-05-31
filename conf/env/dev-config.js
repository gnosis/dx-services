const ENVIRONMENT = 'dev'

// TODO: The env var MARKETS was disabled so in DEV they don't override it
// we should uncoment it
const MARKETS = [
  { tokenA: 'WETH', tokenB: 'RDN' },
  { tokenA: 'WETH', tokenB: 'OMG' }
]

const SLACK_CHANNEL_DX_BOTS = 'GA5J9F13J'
const SLACK_CHANNEL_BOT_FUNDING = SLACK_CHANNEL_DX_BOTS
const SLACK_CHANNEL_AUCTIONS_REPORT = SLACK_CHANNEL_DX_BOTS

module.exports = {
  ENVIRONMENT,
  MARKETS,

  SLACK_CHANNEL_DX_BOTS,
  SLACK_CHANNEL_BOT_FUNDING,
  SLACK_CHANNEL_AUCTIONS_REPORT
}
