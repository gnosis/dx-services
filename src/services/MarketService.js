// const loggerNamespace = 'dx-service:services:ExternalFeedsService'
// const Logger = require('../helpers/Logger')
// const logger = new Logger(loggerNamespace)

class MarketService {
  constructor ({ priceRepo }) {
    this._priceRepo = priceRepo
  }

  async getPrice ({ tokenA, tokenB }) {
    return this._priceRepo.getPrice({ tokenA, tokenB })
  }
}

module.exports = MarketService
