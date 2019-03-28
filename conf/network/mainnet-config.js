const URL_GAS_PRICE_FEED_GAS_STATION = 'https://ethgasstation.info/json/ethgasAPI.json'
const URL_GAS_PRICE_FEED_SAFE = 'https://safe-relay.gnosis.pm/api/v1/gas-station/'

module.exports = {
  NETWORK: 'mainnet', // 1
  ETHEREUM_RPC_URL: 'https://mainnet.infura.io/v3/9408f47dedf04716a03ef994182cf150',

  // Gas price feed
  URL_GAS_PRICE_FEED_GAS_STATION,
  URL_GAS_PRICE_FEED_SAFE,

  // Tokens
  RDN_TOKEN_ADDRESS: null,
  OMG_TOKEN_ADDRESS: null
}
