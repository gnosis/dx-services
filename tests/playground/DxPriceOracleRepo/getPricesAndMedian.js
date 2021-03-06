const formatUtil = require('../../../src/helpers/formatUtil')

const testSetup = require('../../helpers/testSetup')
testSetup()
  .then(run)
  .catch(console.error)

// NETWORK=rinkeby node tests/playground/DxPriceOracleRepo/getPrice.js

async function run ({ dxPriceOracle }) {
  const price = await dxPriceOracle.getPricesAndMedian({
    token: '0x3615757011112560521536258c1e7325ae3b48ae',
    numberOfAuctions: 5,
    auctionIndex: 10
  })
  console.log(`Price:\n`, price)
  console.log(`Formatted price:\n`, formatUtil.formatFraction(price))
}
