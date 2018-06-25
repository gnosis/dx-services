const getDateRangeFromParams = require('../../helpers/getDateRangeFromParams')

const addCacheHeader = require('../helpers/addCacheHeader')

function createRoutes ({ dxInfoService, reportService },
  { short: CACHE_TIMEOUT_SHORT,
    average: CACHE_TIMEOUT_AVERAGE,
    long: CACHE_TIMEOUT_LONG
  }) {
  const routes = []

  // FIXME implement service method used by this endpoint outside reportService
  routes.push({
    path: '/cleared',
    get (req, res) {
      const fromDateStr = req.query.fromDate
      const toDateStr = req.query.toDate
      const period = req.query.period
      const { fromDate, toDate } = getDateRangeFromParams({
        fromDateStr, toDateStr, period
      })
      addCacheHeader({ res, time: CACHE_TIMEOUT_SHORT })
      return reportService.getAuctionsReportInfo({ fromDate, toDate, filterBotInfo: true })
    }
  })

  return routes
}

module.exports = createRoutes
