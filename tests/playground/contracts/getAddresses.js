const testSetup = require('../../helpers/testSetup')
testSetup()
  .then(run)
  .catch(console.error)

function run ({
  DutchExchange,
  TokenOWL,
  TokenTUL
}) {
  console.log('DutchExchange: ', DutchExchange.address)
  console.log('TokenOWL: ', TokenOWL.address)
  console.log('TokenTUL: ', TokenTUL.address)
}
