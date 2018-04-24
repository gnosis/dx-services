const testSetup = require('../../helpers/testSetup')
testSetup()
  .then(run)
  .catch(console.error)

async function run ({
  ethereumRepo
}) {
  let timestamp = process.env.TIMESTAMP
  if (!timestamp) {
    const blockNumber = 20
    const block = await ethereumRepo.getBlock(blockNumber)
    timestamp = block.timestamp
  }
  const referenceDate = new Date(timestamp * 1000)

  return ethereumRepo
    .getFirstBlockAfterDate(referenceDate)
    .then(block => {
      console.log(`block: ${block}`)
    })
    .catch(console.error)
}
