const URL_GAS_PRICE_FEED_GAS_STATION = 'https://ethgasstation.info/json/ethgasAPI.json'
const URL_GAS_PRICE_FEED_SAFE = 'https://safe-relay.gnosis.pm/api/v1/gas-station/'
const ARBITRAGE_NETWORKS = require('../../node_modules/@gnosis.pm/dx-uniswap-arbitrage/networks.json')

UNISWAP_FACTORY_ADDRESS = '0xc0a47dFe034B400B47bDaD5FecDa2621de6c4d95',
ARBITRAGE_CONTRACT_ADDRESS = ARBITRAGE_NETWORKS['Arbitrage']['1']

module.exports = {
  NETWORK: 'mainnet', // 1
  ETHEREUM_RPC_URL: 'https://mainnet.infura.io',

  // Gas price feed
  URL_GAS_PRICE_FEED_GAS_STATION,
  URL_GAS_PRICE_FEED_SAFE,

  // arbitrage relevant addresses
  UNISWAP_FACTORY_ADDRESS,
  ARBITRAGE_CONTRACT_ADDRESS,

  // Tokens
  RDN_TOKEN_ADDRESS: null,
  OMG_TOKEN_ADDRESS: null
}
