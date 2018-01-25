const testSetup = require('../../helpers/testSetup')
testSetup()
  .then(run)
  .catch(console.error)

function run ({
  auctionService
}) {
  return auctionService
    .getBasicInfo()
    .then(console.log)
}
