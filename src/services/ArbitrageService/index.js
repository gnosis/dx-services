const ArbitrageService = require('./ArbitrageService')
const conf = require('../../../conf')
const getArbitrageRepo = require('../../repositories/ArbitrageRepo')
const getAuctionRepo = require('../../repositories/AuctionRepo')
const getEthereumRepo = require('../../repositories/EthereumRepo')

let arbitrageService
module.exports = async () => {
  if (!arbitrageService) {
    const [arbitrageRepo, auctionRepo, ethereumRepo ] = await Promise.all([
      getArbitrageRepo(),
      getAuctionRepo(),
      getEthereumRepo()
    ])
    arbitrageService = new ArbitrageService({
      arbitrageRepo,
      auctionRepo,
      ethereumRepo,
      markets: conf.MARKETS
    })
  }

  return arbitrageService
}
