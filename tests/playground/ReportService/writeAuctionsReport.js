const testSetup = require('../../helpers/testSetup')
const dateUtil = require('../../../src/helpers/dateUtil')
const formatUtil = require('../../../src/helpers/formatUtil')
const fs = require('fs')

testSetup()
  .then(run)
  .catch(console.error)

function run ({
  reportService
}) {
  const now = new Date()
  const fromDate = getDateFromEnv('FROM', dateUtil.toStartOf(now, 'day'))
  const toDate = getDateFromEnv('TO', dateUtil.toEndOf(now, 'day'))
  const fileName = getDateFromEnv('FILE', null)

  return reportService
    .getAuctionsReportFile({
      fromDate,
      toDate
    })
    .then(({ name, mimeType, content }) => {
      console.log('Generated file: "%s"', name)
      console.log('Mime type: "%s"', mimeType)
      console.log('Content:')
      if (fileName) {
        console.log('Write result into: ./' + fileName)
        const fileWriteStream = fs.createWriteStream('./' + fileName)
        content.pipe(fileWriteStream)
      } else {
        content.pipe(process.stdout)
      }
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