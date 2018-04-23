const testSetup = require('../../helpers/testSetup')
testSetup()
  .then(run)
  .catch(console.error)

function run ({
  auctionRepo
}) {
  return auctionRepo
    .getFirstAuctionIndexAfterDate({
      tokenA: 'WETH',
      tokenB: 'RDN'
    })
    .then(auctionIndex => {
      console.log(`auctionIndex: ${auctionIndex}`)
    })
    .catch(console.error)
}