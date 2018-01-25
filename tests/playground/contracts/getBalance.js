const testSetup = require('../../helpers/testSetup')
testSetup()
  .then(run)
  .catch(console.error)

function run ({
  address,
  DutchExchange,
  TokenOWL
}) {
  return DutchExchange
    .balances
    .call(TokenOWL.address, address)
    .then(balance => {
      console.log('The balance for ' + address + ': ' + balance)
    })
}
