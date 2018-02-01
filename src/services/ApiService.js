const debug = require('debug')('dx-service:services:ApiService')
const getGitInfo = require('../helpers/getGitInfo')
const getVersion = require('../helpers/getVersion')

class ApiService {
  constructor ({ auctionRepo, exchangePriceRepo }) {
    this._auctionRepo = auctionRepo

    // Avoids concurrent calls that might endup buy/selling two times
    this.concurrencyCheck = {}

    // About info
    this._gitInfo = getGitInfo()
    this._version = getVersion()
  }

  async getVersion () {
    return this._version
  }

  async getAbout () {
    const auctionInfo = await this._auctionRepo.getBasicInfo()
    const config = Object.assign({
      minimumSellVolume: this._minimumSellVolume
    }, auctionInfo)

    return {
      name: 'Dutch Exchange - Services',
      version: this._version,
      config,
      git: this._gitInfo
    }
  }

  async getCurrencies () {}

  async getMarkets () {}

  async getAuctions ({ currencyA, currencyB }) {
    debug(`Passed tokens are %s,%s`, currencyA, currencyB)
    const auctionInfo = await this._auctionRepo.getStateInfo({sellToken: currencyA, buyToken: currencyB})
    const auctionIndex = await this._auctionRepo.getAuctionIndex({sellToken: currencyA, buyToken: currencyB})
    const currentPrice = await this._auctionRepo.getPrice({sellToken: currencyA, buyToken: currencyB, auctionIndex})
    const sellVolume = await this._auctionRepo.getSellVolume({sellToken: currencyA, buyToken: currencyB})
    const buyVolume = await this._auctionRepo.getBuyVolume({sellToken: currencyA, buyToken: currencyB})
    const sellVolumeNext = await this._auctionRepo.getSellVolumeNext({sellToken: currencyA, buyToken: currencyB})

    return {
      auctionIndex,
      currencyA,
      currencyB,
      // nextAuctionDate, TODO not in repo yet
      // isAuctionRunning, TODO not implemented yet
      currentPrice,
      sellVolume,
      buyVolume,
      sellVolumeNext
    }
  }

  async getBalances (accountAddress) {}
}

module.exports = ApiService
