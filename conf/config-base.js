module.exports = {
  ENVIRONMENT: process.env.ENVIRONMENT || 'local',
  MARKETS: [],

  // Gas
  DEFAULT_GAS: process.env.DEFAULT_GAS || 6700000,

  // Ethereum config
  ETHEREUM_RPC_URL: process.env.ETHEREUM_RPC_URL || 'http://127.0.0.1:8545',
  MNEMONIC: process.env.MNEMONIC || null,

  // Cache
  CACHE: _getCacheConf(),

  // TODO: Remove the following ones. Depreated
  CACHE_ENABLED: process.env.CACHE_ENABLED === 'true',
  CACHE_TIMEOUT_SHORT: process.env.CACHE_TIMEOUT_SHORT || 1,
  CACHE_TIMEOUT_AVERAGE: process.env.CACHE_TIMEOUT_AVERAGE || 15,
  CACHE_TIMEOUT_LONG: process.env.CACHE_TIMEOUT_LONG || 120
}

function _getCacheConf () {
  const CACHE_ENABLED = process.env.CACHE_ENABLED
  const cacheEnabled = CACHE_ENABLED === 'true' || CACHE_ENABLED === undefined
  let CACHE
  if (cacheEnabled) {
    CACHE = {
      short: process.env.CACHE_TIMEOUT_SHORT || 1,
      average: process.env.CACHE_TIMEOUT_AVERAGE || 15,
      long: process.env.CACHE_TIMEOUT_LONG || 120
    }
  }

  return CACHE
}
