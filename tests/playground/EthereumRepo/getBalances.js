const testSetup = require('../../helpers/testSetup')
testSetup()
  .then(run)
  .catch(console.error)

function run ({
  ethereumRepo,
  tokens,
  address
}) {
  const eth = tokens.ETH
  ethereumRepo
    .tokenBalanceOf({
      tokenAddress: '0xe94327d07fc17907b4db788e5adf2ed424addff6', // eth.address
      account: address
    })
    .then(balance => {
      console.log(`Balance for ETH: ${balance}`)
    })
    .catch(console.error)
}
