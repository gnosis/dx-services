const testSetup = require('../../helpers/testSetup')
testSetup()
  .then(run)
  .catch(console.error)

async function run ({ ethereumClient }) {
  const gasPrices = await ethereumClient.getGasPrices()
  console.log(`GasPrices:\n`, gasPrices)
}
