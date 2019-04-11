const URL_GAS_PRICE_FEED_GAS_STATION = 'https://ethgasstation.info/json/ethgasAPI.json'
const URL_GAS_PRICE_FEED_SAFE = 'https://safe-relay.gnosis.pm/api/v1/gas-station/'
const ARBITRAGE_NETWORKS = require('../../node_modules/@gnosis.pm/dx-uniswap-arbitrage/networks.json')

const UNISWAP_FACTORY_ADDRESS = '0xc0a47dFe034B400B47bDaD5FecDa2621de6c4d95'
const ARBITRAGE_CONTRACT_ADDRESS = ARBITRAGE_NETWORKS['Arbitrage']['1']['address']

module.exports = {
  NETWORK: 'mainnet', // 1
  ETHEREUM_RPC_URL: 'https://mainnet.infura.io/v3/9408f47dedf04716a03ef994182cf150',

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
