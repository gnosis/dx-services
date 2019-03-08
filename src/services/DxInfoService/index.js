const DxInfoService = require('./DxInfoService')
const conf = require('../../../conf')
const getAuctionRepo = require('../../repositories/AuctionRepo')
const getDxPriceOracleRepo = require('../../repositories/DxPriceOracleRepo')
const getEthereumRepo = require('../../repositories/EthereumRepo')
const getSlackRepo = require('../../repositories/SlackRepo')

let dxInfoService
module.exports = async () => {
  if (!dxInfoService) {
    const [ auctionRepo, dxPriceOracleRepo, ethereumRepo, slackRepo ] = await Promise.all([
      getAuctionRepo(),
      getDxPriceOracleRepo(),
      getEthereumRepo(),
      getSlackRepo()
    ])
    dxInfoService = new DxInfoService({
      auctionRepo,
      dxPriceOracleRepo,
      ethereumRepo,
      slackRepo,
      markets: conf.MARKETS,
      operationsSlackChannel: conf.SLACK_CHANNEL_OPERATIONS
    })
  }

  return dxInfoService
}
