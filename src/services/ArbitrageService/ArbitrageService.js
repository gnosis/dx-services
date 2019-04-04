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

  async ethToken () {
    return this._auctionRepo.ethToken()
  }

  async manualTrigger () {
    await this._arbitrageRepo
  }

  async depositToken ({ token, amount, from }) {
    return this._arbitrageRepo.depositToken({ token, amount, from })
  }

  async uniswapOpportunity ({ arbToken, amount, from }) {
    return this._arbitrageRepo.uniswapOpportunity({ arbToken, amount, from })
  }

  async transferOwnership ({ address, from }) {
    return this._arbitrageRepo.transferOwnership({ address, from })
  }

  async withdrawEther ({ amount, from }) {
    return this._arbitrageRepo.withdrawEther({ amount, from })
  }

  async withdrawToken ({ token, amount, from }) {
    return this._arbitrageRepo.withdrawToken({ token, amount, from })
  }
  async claimBuyerFunds ({ token, auctionId, from }) {
    return this._arbitrageRepo.claimBuyerFunds({ token, auctionId, from })
  }

  async withdrawEtherThenTransfer ({ amount, from }) {
    return this._arbitrageRepo.withdrawEtherThenTransfer({ amount, from })
  }

  async transferEther ({ amount, from }) {
    return this._arbitrageRepo.transferEther({ amount, from })
  }

  async transferToken ({ token, amount, from }) {
    return this._arbitrageRepo.transferToken({ token, amount, from })
  }

  async dutchOpportunity ({ arbToken, amount, from }) {
    return this._arbitrageRepo.dutchOpportunity({ arbToken, amount, from })
  }

  async getContractEtherBalance () {
    const account = this._arbitrageRepo.getArbitrageAddress()
    const contractBalance = await this._ethereumRepo.balanceOf({ account })
    return numberUtil.fromWei(contractBalance)
  }

  async getArbitrageAddress () {
    return this._arbitrageRepo.getArbitrageAddress()
  }

  async getBalance ({ token, address }) {
    const account = !address
      ? this._arbitrageRepo.getArbitrageAddress()
      : address
    const tokenAddress = !token
      ? await this._auctionRepo.ethToken()
      : await this._auctionRepo.getTokenAddress({ token })
    const tokenInfo = await this._ethereumRepo.tokenGetInfo({ tokenAddress })

    let contractBalance
    if (!token) {
      contractBalance = await this._ethereumRepo.balanceOf({ account })
      contractBalance = numberUtil.fromWei(contractBalance)
      contractBalance += ' ETH'
    } else {
      contractBalance = await this._ethereumRepo.tokenBalanceOf({ tokenAddress, account })
      contractBalance = numberUtil.toDecimal(contractBalance, tokenInfo.decimals || 0)
      contractBalance += ' ' + tokenInfo.symbol
    }

    let dutchBalance = await this._auctionRepo.getBalance({ token: tokenAddress, address: account })
    dutchBalance = numberUtil.toDecimal(dutchBalance, tokenInfo.decimals || 0)
    dutchBalance += ' ' + tokenInfo.symbol

    return { contractBalance, dutchBalance }
  }

  async depositEther ({
    amount,
    from
  }) {
    return this._arbitrageRepo.depositEther({ amount, from })
  }

  async getOwner () {
    return this._arbitrageRepo.getOwner()
  }
}

module.exports = ArbitrageService
