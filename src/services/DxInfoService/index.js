const DxInfoService = require('./DxInfoService')
const conf = require('../../../conf')
const getAuctionRepo = require('../../repositories/AuctionRepo')
const getEthereumRepo = require('../../repositories/EthereumRepo')

let dxInfoService
module.exports = async () => {
  if (!dxInfoService) {
    const [ auctionRepo, ethereumRepo ] = await Promise.all([
      getAuctionRepo(),
      getEthereumRepo()
    ])
    dxInfoService = new DxInfoService({
      auctionRepo,
      ethereumRepo,
      markets: conf.MARKETS
    })
  }

  return dxInfoService
}
