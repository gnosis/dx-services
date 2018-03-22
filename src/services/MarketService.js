// const loggerNamespace = 'dx-service:services:ExternalFeedsService'
// const Logger = require('../helpers/Logger')
// const logger = new Logger(loggerNamespace)

class MarketService {
  constructor ({ exchangePriceRepo }) {
    this._exchangePriceRepo = exchangePriceRepo
  }

  async getPrice ({ tokenA, tokenB }) {
    return this._exchangePriceRepo.getPrice({ tokenA, tokenB })
  }
}

module.exports = MarketService
