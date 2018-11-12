const MarketService = require('./MarketService')
const getPriceRepo = require('../../repositories/PriceRepo')

let marketService
module.exports = async () => {
  if (!marketService) {
    const priceRepo = await getPriceRepo()
    marketService = new MarketService({
      priceRepo
    })
  }

  return marketService
}
