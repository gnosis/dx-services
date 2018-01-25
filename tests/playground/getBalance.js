const testSetup = require('../helpers/testSetup')

testSetup({})
  .then(({
    DutchExchange,
    address,
    TokenOWL
  }) => {
    return DutchExchange
      .balances
      .call(TokenOWL.address, address)
      .then(balance => {
        console.log('The balance for ' + address + ': ' + balance)
      })
  })
