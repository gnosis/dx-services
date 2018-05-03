const testSetup = require('../../helpers/testSetup')
const getDateRangeFromParams = require('../../../src/helpers/getDateRangeFromParams')

testSetup()
  .then(run)
  .catch(console.error)

function run ({
  reportService
}) {
  const fromDateStr = process.env.FROM
  const toDateStr = process.env.TO
  const period = process.env.PERIOD || 'today'

  const { fromDate, toDate } = getDateRangeFromParams({
    fromDateStr, toDateStr, period
  })

  return reportService
    .getAuctionsReportInfo({
      period,
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
