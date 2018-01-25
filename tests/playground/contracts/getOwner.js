const testSetup = require('../../helpers/testSetup')
testSetup()
  .then(run)
  .catch(console.error)

function run ({
  DutchExchange
}) {
  return DutchExchange
    .owner
    .call()
    .then(owner => {
      console.log('The dutch exchange is owned by: ' + owner)
    })
}
