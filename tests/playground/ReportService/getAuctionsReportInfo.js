const testSetup = require('../../helpers/testSetup')
testSetup()
  .then(run)
  .catch(console.error)

function run ({
  reportService
}) {
  return reportService
    .getAuctionsReportInfo()
    .then(auctions => {
      auctions.forEach(auction => {
        console.log(JSON.stringify(auction))
      })
    })
}
