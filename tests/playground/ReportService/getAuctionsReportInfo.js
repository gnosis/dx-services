const testSetup = require('../../helpers/testSetup')
const dateUtil = require('../../../src/helpers/dateUtil')

testSetup()
  .then(run)
  .catch(console.error)

function run ({
  reportService
}) {
  const now = new Date()
  const fromDate = dateUtil.toStartOf(now, 'day')
  const toDate = dateUtil.toEndOf(now, 'day')

  return reportService
    .getAuctionsReportInfo({
      fromDate,
      toDate
    })
    .then(auctions => {
      console.log('Got %d auctions:', auctions.length)
      auctions.forEach(auction => {
        console.log(JSON.stringify(auction))
      })
    })
    .catch(console.error)
}
