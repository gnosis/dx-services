const DxInfoService = require('./DxInfoService')
const conf = require('../../../conf')
const getAuctionRepo = require('../../repositories/AuctionRepo')
const getEthereumRepo = require('../../repositories/EthereumRepo')
const getSlackRepo = require('../../repositories/SlackRepo')

let dxInfoService
module.exports = async () => {
  if (!dxInfoService) {
    const [ auctionRepo, ethereumRepo, slackRepo ] = await Promise.all([
      getAuctionRepo(),
      getEthereumRepo(),
      getSlackRepo()
    ])
    dxInfoService = new DxInfoService({
      auctionRepo,
      ethereumRepo,
      slackRepo,
      markets: conf.MARKETS,
      operationsSlackChannel: conf.SLACK_CHANNEL_OPERATIONS
    })
  }

  return dxInfoService
}
