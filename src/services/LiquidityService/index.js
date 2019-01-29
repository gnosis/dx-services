const LiquidityService = require('./LiquidityService')
const conf = require('../../../conf')
const getArbitrageRepo = require('../../repositories/ArbitrageRepo')
const getAuctionRepo = require('../../repositories/AuctionRepo')
const getEthereumRepo = require('../../repositories/EthereumRepo')
const getPriceRepo = require('../../repositories/PriceRepo')

let liquidityService
module.exports = async () => {
  if (!liquidityService) {
    const [ arbitrageRepo, auctionRepo, ethereumRepo, priceRepo ] = await Promise.all([
      getArbitrageRepo(),
      getAuctionRepo(),
      getEthereumRepo(),
      getPriceRepo()
    ])
    liquidityService = new LiquidityService({
      arbitrageRepo,
      auctionRepo,
      ethereumRepo,
      priceRepo,

      // TODO: Review, I think this should be moved to the bots
      buyLiquidityRulesDefault: conf.BUY_LIQUIDITY_RULES_DEFAULT
    })
  }

  return liquidityService
}
