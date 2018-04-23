const testSetup = require('../../helpers/testSetup')
testSetup()
  .then(run)
  .catch(console.error)

function run ({
  auctionRepo
}) {
  return auctionRepo
    .getSellOrders()
    .then(orders => {
      orders.forEach(({ sellToken, buyToken, user, amount, auctionIndex }) => {
        console.log(`\nOrder:\n`, {
          sellToken: sellToken.valueOf(),
          buyToken: buyToken.valueOf(),
          user: user.valueOf(),
          amount: amount.valueOf(),
          auctionIndex: auctionIndex.valueOf()
        })
      })
    })
    .catch(console.error)
}