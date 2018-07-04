const testSetup = require('../../helpers/testSetup')
const getDateRangeFromParams = require('../../../src/helpers/getDateRangeFromParams')
const getBotAddress = require('./../../src/helpers/getBotAddress')

testSetup()
  .then(run)
  .catch(console.error)

async function run ({
  reportService,
  ethereumClient
}) {
  const fromDateStr = process.env.FROM
  const toDateStr = process.env.TO
  const period = process.env.PERIOD || 'today'

  const { fromDate, toDate } = getDateRangeFromParams({
    fromDateStr, toDateStr, period
  })
  const botAddress = await getBotAddress(ethereumClient)

  return reportService
    .getAuctionsReportInfo({
      period,
      fromDate,
      toDate,
      account: botAddress
    })
    .then(auctions => {
      console.log('Got %d auctions:', auctions.length)
      auctions.forEach(auction => {
        console.log(JSON.stringify(auction))
      })
    })
    .catch(console.error)
}
