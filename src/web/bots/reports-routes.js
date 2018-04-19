const loggerNamespace = 'dx-service:repositories:AuctionRepoImpl'
const Logger = require('../../helpers/Logger')
const logger = new Logger(loggerNamespace)

const dateUtil = require('../../helpers/dateUtil')
const formatUtil = require('../../helpers/formatUtil')
let requestId = 1

function createRoutes ({ dxInfoService }) {
  const routes = []

  // AuctionsReport
  //    test:
  //      curl http://localhost:8081/api/v1/reports/auctions-report/requests
  //      curl http://localhost:8081/api/v1/reports/auctions-report/requests?from-date=26/11/1984&to-date=26/11/1984
  routes.push({
    path: '/auctions-report/requests',
    get (req, res) {
      let [ fromDateStr, toDateStr, period ] = [
        'from-date',
        'to-date',
        'period'
      ].map(p => req.query[p])

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

      if (error) {
        error.status = 412
        throw error
      }

      // We include the fromDate day amd the toDate day in the date range
      fromDate = dateUtil.toStartOf(fromDate, 'day')
      toDate = dateUtil.toEndOf(toDate, 'day')

      logger.info('Requested AuctionsReport from %s to %s',
        formatUtil.formatDateTime(fromDate),
        formatUtil.formatDateTime(toDate)
      )

      // TODO: Get XLS for the provided dates
      // TODO: Send XLS to SLACK
      return res.json({
        message: 'The report request has been submited',
        id: requestId++
      })
    }
  })

  return routes
}

module.exports = createRoutes
