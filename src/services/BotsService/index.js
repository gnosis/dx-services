const BotsService = require('./BotsService')
const conf = require('../../../conf')
const getAuctionRepo = require('../../repositories/AuctionRepo')
const getEthereumRepo = require('../../repositories/EthereumRepo')

let botService
module.exports = async () => {
  if (!botService) {
    const [ auctionRepo, ethereumRepo ] = await Promise.all([
      getAuctionRepo(),
      getEthereumRepo()
    ])
    botService = new BotsService({
      auctionRepo,
      ethereumRepo,
      markets: conf.MARKETS
    })
  }

  return botService
}
