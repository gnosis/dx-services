module.exports = {
  ENVIRONMENT: process.env.ENVIRONMENT || 'local',
  MARKETS: [],

  // Gas
  DEFAULT_GAS: process.env.DEFAULT_GAS || 6700000,

  // Ethereum config
  ETHEREUM_RPC_URL: process.env.ETHEREUM_RPC_URL || 'http://127.0.0.1:8545',
  MNEMONIC: process.env.MNEMONIC || null,

  // Cache
  CACHE_ENABLED: process.env.CACHE_ENABLED === 'true',
  CACHE_TIMEOUT_SHORT: process.env.CACHE_TIMEOUT_SHORT || 1,
  CACHE_TIMEOUT_AVERAGE: process.env.CACHE_TIMEOUT_AVERAGE || 15,
  CACHE_TIMEOUT_LONG: process.env.CACHE_TIMEOUT_LONG || 120
}
