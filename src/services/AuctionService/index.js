const AuctionService = require('./AuctionService')
const conf = require('../../../conf')
const getAuctionRepo = require('../../repositories/AuctionRepo')
const getEthereumRepo = require('../../repositories/EthereumRepo')

let auctionService
module.exports = async () => {
  if (!auctionService) {
    const [ auctionRepo, ethereumRepo ] = await Promise.all([
      getAuctionRepo(),
      getEthereumRepo()
    ])
    auctionService = new AuctionService({
      auctionRepo,
      ethereumRepo,
      markets: conf.MARKETS
    })
  }

  return auctionService
}
