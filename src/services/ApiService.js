const debug = require('debug')('dx-service:services:ApiService')
const getGitInfo = require('../helpers/getGitInfo')
const getVersion = require('../helpers/getVersion')

class ApiService {
  constructor ({ auctionRepo, ethereumRepo, markets }) {
    this._auctionRepo = auctionRepo
    this._ethereumRepo = ethereumRepo

    // Avoids concurrent calls that might endup buy/selling two times
    this.concurrencyCheck = {}

    // About info
    this._gitInfo = getGitInfo()
    this._version = getVersion()
    this._markets = markets
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

  async getMarkets () {
    return this._markets
  }

  async getCurrencies () {}

  async getAuctions ({ currencyA, currencyB }) {
    debug(`Passed tokens are %s,%s`, currencyA, currencyB)
    const auctionInfo = await this._auctionRepo.getStateInfo({
      sellToken: currencyA, buyToken: currencyB
    })
    const sellVolumeNext = await this._auctionRepo.getSellVolumeNext({sellToken: currencyA, buyToken: currencyB})

    return {
      auctionInfo,
      auctionIndex: auctionInfo.auctionIndex,
      currencyA,
      currencyB,
      // nextAuctionDate, TODO not in repo yet
      isAuctionRunning: this._isAuctionRunning(auctionInfo),
      buyVolume: auctionInfo.auction.sellVolume,
      sellVolume: auctionInfo.auction.sellVolume,
      sellVolumeNext
    }
  }

  _isAuctionRunning (auction) {
    const now = new Date()
    if (auction.auctionStart === null || auction.auctionStart >= now ||
      auction.auction.isClosed || auction.auctionOpp.isClosed) {
      return false
    } else {
      return true
    }
  }

  async getCurrentPrice ({sellToken, buyToken}) {
    debug(`Passed tokens are %s,%s`, sellToken, buyToken)

    const auctionIndex = await this._auctionRepo.getAuctionIndex({sellToken, buyToken})
    return this._auctionRepo.getPrice({sellToken, buyToken, auctionIndex})
  }

  async getBalances ({accountAddress}) {
    return this._auctionRepo.getBalances({accountAddress})
  }
}

module.exports = ApiService
