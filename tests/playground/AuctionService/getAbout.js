const testSetup = require('../../helpers/testSetup')
testSetup()
  .then(run)
  .catch(console.error)

function run ({
  auctionService
}) {
  return auctionService
    .getAbout()
    .then(console.log)
}
