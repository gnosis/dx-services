const loggerNamespace = 'dx-service:services:ArbitrageService'
const Logger = require('../../helpers/Logger')
const assert = require('assert')
const logger = new Logger(loggerNamespace)
const numberUtil = require('../../helpers/numberUtil')

class ArbitrageService {
  constructor ({
    arbitrageRepo,
    auctionRepo,
    ethereumRepo,
    markets
  }) {
    assert(arbitrageRepo, '"auctionRepo" is required')
    assert(auctionRepo, '"auctionRepo" is required')
    assert(ethereumRepo, '"ethereumRepo" is required')
    assert(markets, '"markets" is required')

    this._arbitrageRepo = arbitrageRepo
    this._auctionRepo = auctionRepo
    this._ethereumRepo = ethereumRepo
    this._markets = markets
  }

  async getBalance() {
    const account = this._arbitrageRepo.getArbitrageAddress()
    const balance = await this._ethereumRepo.balanceOf({ account })
    return numberUtil.fromWei(balance)
  }

  async depositEther({
    amount,
    from
  }) {
    await this._arbitrageRepo.depositEther({amount, from})
  }

}

module.exports = ArbitrageService
