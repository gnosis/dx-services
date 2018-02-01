const testSetup = require('../../helpers/testSetup')
testSetup()
  .then(run)
  .catch(console.error)

function run ({
  botService
}) {
  return botService
    .getAbout()
    .then(console.log)
}
