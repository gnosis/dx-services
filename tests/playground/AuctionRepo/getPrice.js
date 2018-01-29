const testSetup = require('../../helpers/testSetup')
testSetup()
  .then(run)
  .catch(console.error)

function run ({
  auctionRepo,
  address
}) {
  const token = 'ETH'
  return auctionRepo
    .getPriceOracle({ token })
    .then(price => {
      console.log(`The price for ${token} is ${price.numerator}/${price.denominator}`)
    })
}
