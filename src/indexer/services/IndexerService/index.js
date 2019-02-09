// const conf = require('../../../../conf')
const getAuctionRepo = require('../../../repositories/AuctionRepo')
const getEthereumRepo = require('../../../repositories/EthereumRepo')
const IndexerService = require('./IndexerService')

let indexerService
module.exports = async () => {
  if (!indexerService) {
    const [auctionRepo, ethereumRepo] = await Promise.all([
      getAuctionRepo(),
      getEthereumRepo()
    ])
    indexerService = new IndexerService({
      auctionRepo,
      ethereumRepo
    })
  }

  return indexerService
}
