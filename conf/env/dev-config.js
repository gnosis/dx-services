const ENVIRONMENT = 'DEV'

const DX_CONTRACT_ADDRESS = null

const MARKETS = [
  {tokenA: 'ETH', tokenB: 'RDN'},
  {tokenA: 'ETH', tokenB: 'OMG'}
]

const RDN_TOKEN_ADDRESS = null
const OMG_TOKEN_ADDRESS = null

const ETHEREUM_RPC_URL = 'http://127.0.0.1:8545'
const BOT_ACCOUNT_MNEMONIC = 'candy maple cake sugar pudding cream honey rich smooth crumble sweet treat'

module.exports = {
  ENVIRONMENT,
  DX_CONTRACT_ADDRESS,
  MARKETS,

  // CONTRACTS
  RDN_TOKEN_ADDRESS,
  OMG_TOKEN_ADDRESS,

  // Ethereum config
  ETHEREUM_RPC_URL,
  BOT_ACCOUNT_MNEMONIC
}
