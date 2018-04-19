const loggerNamespace = 'dx-service:repositories:AuctionRepoImpl'
const Logger = require('../../helpers/Logger')
const logger = new Logger(loggerNamespace)

// const dateUtil = require('../../helpers/dateUtil')
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
      let [ fromDate, toDate ] = ['from-date', 'to-date'].map(p => req.query[p])
      logger.info('Requested AuctionsReport from %s to %s. %s',
        fromDate,
        toDate
      )
      console.log(req.body)

      if (!fromDate && !toDate) {
        toDate = new Date() // Today
        fromDate = new Date() // One week ago  dateUtil.toEndOf()
      } else if (fromDate && toDate) {
        toDate = new Date() // Today
        fromDate = new Date() // One week ago  dateUtil.toEndOf()
      } else {
        const error = new Error("When providing filter dates, both params are mandatory: 'from-date', 'to-date'")
        error.type = 'DATE_RANGE_INVALID'
        error.status = 412
        throw error
      }

      logger.info('Requested AuctionsReport from %s to %s',
        formatUtil.formatDate(fromDate),
        formatUtil.formatDate(toDate)
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
