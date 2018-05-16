const env = process.env.NODE_ENV
let DX_CONTRACT_ADDRESS, RDN_TOKEN_ADDRESS, OMG_TOKEN_ADDRESS

// In Rinkeby we use different instances of the contract for dev and staging
if (env === 'pre') {
  // Rinkeby: staging
  DX_CONTRACT_ADDRESS = '0x92f7da601234480433cc9e020710961bd1a2cc79'
  RDN_TOKEN_ADDRESS = '0x7e2331beaec0ded82866f4a1388628322c8d5af0'
  OMG_TOKEN_ADDRESS = '0xc57b5b272ccfd0f9e4aa8c321ec22180cbb56054' 
} else {
  if (env === 'pro') {
    // Rinkeby: pro
    DX_CONTRACT_ADDRESS = null
    RDN_TOKEN_ADDRESS = null
    OMG_TOKEN_ADDRESS = null
  } else {
    // Rinkeby: dev, local, ...
    DX_CONTRACT_ADDRESS = '0x6af10f3758912816c57e30cecd59c7695e1db2ee'
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
