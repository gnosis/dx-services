const testSetup = require('../../helpers/testSetup')
const getDateRangeFromParams = require('../../../src/helpers/getDateRangeFromParams')
const formatUtil = require('../../../src/helpers/formatUtil')

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
    .sendAuctionsReportToSlack({
      fromDate,
      toDate
    })
    .then(receipt => {
      console.log('Receipt id:', receipt.id)
    })
    .catch(console.error)
}
