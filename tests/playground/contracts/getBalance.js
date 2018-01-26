const testSetup = require('../../helpers/testSetup')
testSetup()
  .then(run)
  .catch(console.error)

function run ({
  address,
  DutchExchange,
  EtherToken
}) {
  return DutchExchange
    .balances
    .call(EtherToken.address, address)
    .then(balance => {
      console.log(`The balance of the account ${address} in EtherToken (${EtherToken.address}) is ${balance}`)
    })
}
