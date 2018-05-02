const env = process.env.NODE_ENV
let DX_CONTRACT_ADDRESS, RDN_TOKEN_ADDRESS, OMG_TOKEN_ADDRESS

// In Rinkeby we use different instances of the contract for dev and staging
if (env === 'pre') {
  // Rinkeby: staging
  DX_CONTRACT_ADDRESS = '0x16be0a7aff00a35f43ca467b6fbbb2d511118553'
  RDN_TOKEN_ADDRESS = '0xd7da78985fbf633bae69eb01e2ca7187304920c1'
  OMG_TOKEN_ADDRESS = '0x46965eb364b661609c9b3b9625527040618eb0e1'
} else {
  if (env === 'pro') {
    // Rinkeby: pro
    DX_CONTRACT_ADDRESS = null
    RDN_TOKEN_ADDRESS = null
    OMG_TOKEN_ADDRESS = null
  } else {
    // Rinkeby: dev, local, ...
    DX_CONTRACT_ADDRESS = null
    RDN_TOKEN_ADDRESS = '0x7e2331beaec0ded82866f4a1388628322c8d5af0'
    OMG_TOKEN_ADDRESS = '0xc57b5b272ccfd0f9e4aa8c321ec22180cbb56054'
  }
}

module.exports = {
  NETWORK: 'rinkeby', // 4
  ETHEREUM_RPC_URL: 'https://rinkeby.infura.io',

  // Tokens
  DX_CONTRACT_ADDRESS,
  RDN_TOKEN_ADDRESS,
  OMG_TOKEN_ADDRESS
}
