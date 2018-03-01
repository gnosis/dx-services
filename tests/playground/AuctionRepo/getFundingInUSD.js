const testSetup = require('../../helpers/testSetup')
testSetup()
  .then(run)
  .catch(console.error)

function run ({
  auctionRepo
}) {
  const tokenA = 'RDN'
  const tokenB = 'ETH'
  const auctionIndex = 1
  
  return auctionRepo
    .getFundingInUSD({ tokenA, tokenB, auctionIndex })
    .then(({ foundingA, foundingB }) => {
      console.log(`The funding un USD for auction ${auctionIndex} of \
${tokenA}-${tokenB} pair is:
\t* ${tokenA}: ${foundingA} USD
\t* ${tokenB}: ${foundingB} USD`)
    })
}
