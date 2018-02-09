/* eslint camelcase: "off" */

const testSetup = require('../../helpers/testSetup')
testSetup()
  .then(run)
  .catch(console.error)

async function run ({
  auctionRepo,
  owner
}) {
  // Add GNO-ETH pair
  const txGNO_ETH = await auctionRepo.addTokenPair({
    from: owner,
    tokenA: 'RDN',
    tokenAFunding: 0,
    tokenB: 'ETH',
    tokenBFunding: 15.123,
    initialClosingPrice: {
      numerator: 4079, // ETH
      denominator: 1000000 // RDN
    }
  })

  const txOMG_ETH = await auctionRepo.addTokenPair({
    from: owner,
    tokenA: 'OMG',
    tokenAFunding: 0,
    tokenB: 'ETH',
    tokenBFunding: 15.123,
    initialClosingPrice: {
      numerator: 4079,
      denominator: 1000000
    }
  })

  // https://walletinvestor.com/converter/raiden-network-token/omisego/1
  const txRDN_OMG = await auctionRepo.addTokenPair({
    from: owner,
    tokenA: 'OMG',
    tokenAFunding: 700,
    tokenB: 'RDN',
    tokenBFunding: 0,
    initialClosingPrice: {
      numerator: 290818,
      denominator: 1000000
    }
  })
  console.log('The tokens pairs has been added', {
    txGNO_ETH, txOMG_ETH, txRDN_OMG
  })
}
