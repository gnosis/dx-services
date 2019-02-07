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

  async getContractEtherBalance() {
    const account = this._arbitrageRepo.getArbitrageAddress()
    const contractBalance = await this._ethereumRepo.balanceOf({ account })
    return numberUtil.fromWei(contractBalance)
  }

  async getBalance(token) {
    const account = this._arbitrageRepo.getArbitrageAddress()
    let tokenAddress, contractBalance
    tokenAddress = !token ? await this._auctionRepo.ethToken() : token
    const tokenInfo = await this._ethereumRepo.tokenGetInfo({tokenAddress})


    if (!token) {
      contractBalance = await this._ethereumRepo.balanceOf({ account })
      contractBalance = numberUtil.fromWei(contractBalance)
      contractBalance += ' Eth'
    } else {
      contractBalance = await this._ethereumRepo.tokenBalanceOf({tokenAddress, account})
      contractBalance = numberUtil.toDecimal(contractBalance, tokenInfo.decimals || 0)
      contractBalance += ' ' + tokenInfo.symbol
    }

    let dutchBalance = await this._auctionRepo.getBalance ({ token: tokenAddress, address: account })
    dutchBalance = numberUtil.toDecimal(dutchBalance, tokenInfo.decimals || 0)
    dutchBalance += ' ' + tokenInfo.symbol

    return {contractBalance, dutchBalance}
  }

  async depositEther({
    amount,
    from
  }) {
    return await this._arbitrageRepo.depositEther({amount, from})
  }


  async getOwner() {
    return this._arbitrageRepo.getOwner()
  }

}

module.exports = ArbitrageService
