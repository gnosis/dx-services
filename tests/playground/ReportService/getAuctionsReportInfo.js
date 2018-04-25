const testSetup = require('../../helpers/testSetup')
const dateUtil = require('../../../src/helpers/dateUtil')
const formatUtil = require('../../../src/helpers/formatUtil')

testSetup()
  .then(run)
  .catch(console.error)

function run ({
  reportService
}) {
  const now = new Date()
  const fromDate = getDateFromEnv('FROM', dateUtil.toStartOf(now, 'day'))
  const toDate = getDateFromEnv('TO', dateUtil.toEndOf(now, 'day'))

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

function getDateFromEnv (envVarName, defaultValue) {
  let date = process.env[envVarName]
  if (date) {
    return formatUtil.parseDateIso(date)
  } else {
    return defaultValue
  }
}