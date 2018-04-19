const loggerNamespace = 'dx-service:services:ReportService'
const Logger = require('../helpers/Logger')
const dateUtil = require('../helpers/dateUtil')
const formatUtil = require('../helpers/formatUtil')
const logger = new Logger(loggerNamespace)

const AUCTIONS_REPORT_MAX_NUM_DAYS = 15

const assert = require('assert')

// const AuctionLogger = require('../helpers/AuctionLogger')
// const auctionLogger = new AuctionLogger(loggerNamespace)
// const ENVIRONMENT = process.env.NODE_ENV

class ReportService {
  constructor ({ auctionRepo, ethereumRepo, markets }) {
    this._auctionRepo = auctionRepo
    this._ethereumRepo = ethereumRepo
    this._markets = markets
  }

  async getAuctionsReportFile ({ fromDate, toDate }) {
    assert(fromDate < toDate, "The 'toDate' must be greater than the 'fromDate'")

    logger.info('Generate auction report from "%s" to "%s"',
      formatUtil.formatDateTime(fromDate),
      formatUtil.formatDateTime(toDate)
    )

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve({
          name: 'auctions-reports.csv',
          mimeType: 'text/csv',
          content: null
        })
      }, 3000)
    })
  }
}

module.exports = ReportService
