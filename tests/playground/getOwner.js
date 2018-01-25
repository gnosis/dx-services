const testSetup = require('../helpers/testSetup')

testSetup({})
  .then(({ DutchExchange }) => {
    return DutchExchange.owner.call()
  })
  .then(owner => {
    console.log('The dutch exchange is owned by: ' + owner)
  })
