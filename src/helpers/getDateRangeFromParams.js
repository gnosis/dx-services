const formatUtil = require('./formatUtil')
const dateUtil = require('./dateUtil')

function getDateRangeFromParams ({
  fromDateStr,
  toDateStr,
  period
}) {
  let toDate, fromDate, error
  if (fromDateStr && toDateStr) {
    fromDate = formatUtil.parseDate(fromDateStr)
    toDate = formatUtil.parseDate(toDateStr)
  } else if (period) {
    const today = new Date()
    switch (period) {
      case 'today':
        fromDate = today
        toDate = today
        break

      case 'yesterday':
        const yesterday = dateUtil.addPeriod(today, -1, 'days')
        fromDate = yesterday
        toDate = yesterday
        break

      case 'week':
        const oneWeekAgo = dateUtil.addPeriod(today, -7, 'days')
        fromDate = oneWeekAgo
        toDate = today
        break

      case 'last-week':
        const lastWeek = dateUtil.addPeriod(today, -1, 'weeks')
        fromDate = dateUtil.toStartOf(lastWeek, 'isoWeek')
        toDate = dateUtil.toEndOf(lastWeek, 'isoWeek')
        break

      case 'current-week':
        fromDate = dateUtil.toStartOf(today, 'isoWeek')
        toDate = dateUtil.toEndOf(today, 'isoWeek')
        break

      default:
        error = new Error(`Unknown 'period': ${period}. Valid values are: day, week`)
        error.type = 'DATE_RANGE_INVALID'
        error.data = { period }
    }
  } else {
    error = new Error("Either 'from-date' and 'to-date' params or 'period' params, are required.")
    error.type = 'DATE_RANGE_INVALID'
    error.data = {
      fromDate: fromDateStr || null,
      toDate: toDateStr || null
    }
  }

  if (!error) {
    // We include the fromDate day amd the toDate day in the date range
    fromDate = dateUtil.toStartOf(fromDate, 'day')
    toDate = dateUtil.toEndOf(toDate, 'day')
    
    // Validate that the range is valid
    if (fromDate > toDate) {
      error = new Error("'toDate' must be greater than 'fromDate")
      error.type = 'DATE_RANGE_INVALID'
      error.data = {
        fromDate,
        toDate
      }
    }
  }

  if (error) {
    error.status = 412
    throw error
  }

  return { fromDate, toDate }
}

module.exports = getDateRangeFromParams
