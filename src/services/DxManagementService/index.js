const DxManagementService = require('./DxManagementService')
const getAuctionRepo = require('../../repositories/AuctionRepo')
const getEthereumRepo = require('../../repositories/EthereumRepo')

let dxManagementService
module.exports = async () => {
  if (!dxManagementService) {
    const [ auctionRepo, ethereumRepo ] = await Promise.all([
      getAuctionRepo(),
      getEthereumRepo()
    ])
    dxManagementService = new DxManagementService({
      auctionRepo,
      ethereumRepo
    })
  }

  return dxManagementService
}
