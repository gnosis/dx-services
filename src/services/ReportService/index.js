const ReportService = require('./ReportService')
const conf = require('../../../conf')
const getAuctionRepo = require('../../repositories/AuctionRepo')
const getEthereumRepo = require('../../repositories/EthereumRepo')
const getSlackRepo = require('../../repositories/SlackRepo')

let reportService
module.exports = async () => {
  if (!reportService) {
    const [ auctionRepo, ethereumRepo, slackRepo ] = await Promise.all([
      getAuctionRepo(),
      getEthereumRepo(),
      getSlackRepo()
    ])
    reportService = new ReportService({
      auctionRepo,
      ethereumRepo,
      slackRepo,
      markets: conf.MARKETS,
      auctionsReportSlackChannel: conf.SLACK_CHANNEL_AUCTIONS_REPORT
    })
  }

  return reportService
}
