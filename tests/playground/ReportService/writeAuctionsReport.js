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
    .getAuctionsReportFile({ fromDate, toDate })
    .then(({ name, mimeType, content }) => {
      console.log('Generated file: "%s"', name)
      console.log('Mime type: "%s"', mimeType)
      console.log('Content:')
      content.pipe(process.stdout)
    })
}
