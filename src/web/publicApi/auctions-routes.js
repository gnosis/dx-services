const getDateRangeFromParams = require('../../helpers/getDateRangeFromParams')
const formatUtil = require('../../helpers/formatUtil')
const _tokenPairSplit = formatUtil.tokenPairSplit

const addCacheHeader = require('../helpers/addCacheHeader')

function createRoutes ({ dxInfoService, auctionService },
  { short: CACHE_TIMEOUT_SHORT,
    average: CACHE_TIMEOUT_AVERAGE,
    long: CACHE_TIMEOUT_LONG
  }) {
  const routes = []

  routes.push({
    path: '/cleared',
    get (req, res) {
      const fromDateStr = req.query.fromDate
      const toDateStr = req.query.toDate
      const period = req.query.period
      const { sellToken, buyToken } = req.query.tokenPair
        ? _tokenPairSplit(req.query.tokenPair)
        : { sellToken: undefined, buyToken: undefined }
      const { fromDate, toDate } = getDateRangeFromParams({
        fromDateStr, toDateStr, period
      })
      addCacheHeader({ res, time: CACHE_TIMEOUT_SHORT })
      return auctionService.getAuctionsReportInfo({
        fromDate, toDate, sellToken, buyToken })
    }
  })

  return routes
}

module.exports = createRoutes
