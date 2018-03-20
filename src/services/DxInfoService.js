const loggerNamespace = 'dx-service:services:DxInfoService'
// const Logger = require('../helpers/Logger')
// const logger = new Logger(loggerNamespace)
const AuctionLogger = require('../helpers/AuctionLogger')
const auctionLogger = new AuctionLogger(loggerNamespace)

const getGitInfo = require('../helpers/getGitInfo')
const getVersion = require('../helpers/getVersion')

class DxInfoService {
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

  setBots (bots) {
    this._bots = bots
  }

  async getHealthEthereum () {
    return this._ethereumRepo.getHealth()
  }

  async getAbout () {
    const auctionAbout = await this._auctionRepo.getAbout()
    const ethereumAbout = await this._ethereumRepo.getAbout()

    const config = {
      minimumSellVolume: this._minimumSellVolume,
      botAddress: this._botAddress,
      markets: this._markets
    }

    const bots = await Promise.all(
      this._bots.map(async bot => {
        const botInfo = await bot.getInfo()
        return Object.assign({
          name: bot.name,
          startTime: bot.startTime
        }, botInfo)
      })
    )

    return {
      name: 'Dutch Exchange - Services',
      version: this._version,
      auctions: auctionAbout,
      bots,
      ethereum: ethereumAbout,
      config,
      git: this._gitInfo
    }
  }

  async getMarkets () {
    return this._markets
  }

  async getCurrencies () {}

  async getAuctions ({ currencyA, currencyB }) {
    auctionLogger.debug({
      sellToken: currencyA,
      buyToken: currencyB,
      msg: 'Get auctions'
    })
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
    auctionLogger.debug({ sellToken, buyToken, msg: 'Get current price' })

    const auctionIndex = await this._auctionRepo.getAuctionIndex({sellToken, buyToken})
    return this._auctionRepo.getCurrentAuctionPrice({sellToken, buyToken, auctionIndex})
  }

  async getBalances ({accountAddress}) {
    return this._auctionRepo.getBalances({accountAddress})
  }
}

module.exports = DxInfoService
