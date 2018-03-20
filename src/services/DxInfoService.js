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

  async getHealthEthereum () {
    return this._ethereumRepo.getHealth()
  }

  async getMarketDetails ({ sellToken, buyToken }) {
    const tokenPair = { sellToken, buyToken }
    const [
      isSellTokenApproved,
      isBuyTokenApproved,
      stateInfo,
      state,
      isApprovedMarket,
      auctionIndex
    ] = await Promise.all([
      this._auctionRepo.isApprovedToken({ token: sellToken }),
      this._auctionRepo.isApprovedToken({ token: buyToken }),
      this._auctionRepo.getStateInfo(tokenPair),
      this._auctionRepo.getState(tokenPair),
      this._auctionRepo.isApprovedMarket({
        tokenA: sellToken,
        tokenB: buyToken
      }),
      this._auctionRepo.getAuctionIndex(tokenPair)
    ])

    const result = {
      isApprovedMarket,
      state,
      isSellTokenApproved,
      isBuyTokenApproved,
      auctionIndex: stateInfo.auctionIndex,
      auctionStart: stateInfo.auctionStart
    }

    if (stateInfo.auction) {
      result.auction = await this._getAuctionDetails({
        auction: stateInfo.auctionOpp,
        tokenA: buyToken,
        tokenB: sellToken,
        auctionIndex,
        state
      })
    }

    if (stateInfo.auctionOpp) {
      result.auctionOpp = await this._getAuctionDetails({
        auction: stateInfo.auctionOpp,
        tokenA: buyToken,
        tokenB: sellToken,
        auctionIndex,
        state
      })
    }

    return result
  }

  async _getAuctionDetails ({ auction, tokenA, tokenB, auctionIndex, state }) {
    const fundingInUSD = await this._auctionRepo.getFundingInUSD({
      tokenA, tokenB, auctionIndex
    })
    
    const price = await this._auctionRepo.getCurrentAuctionPrice({
      sellToken: tokenA,
      buyToken: tokenB,
      auctionIndex
    })

    let closingPrice, buyVolumesInSellTokens, priceRelationshipPercentage,
      boughtPercentage, outstandingVolume
    
    if (price) {
      if (auctionIndex > 1) {
        closingPrice = await this._auctionRepo.getPastAuctionPrice({
          sellToken: tokenA,
          buyToken: tokenB,
          auctionIndex: auctionIndex - 1
        })
      }

      if (closingPrice) {
        if (price.numerator.isZero()) {
          // The auction runned for too long
          buyVolumesInSellTokens = auction.sellVolume
          priceRelationshipPercentage = null
        } else {
          // Get the number of sell tokens that we can get for the buyVolume
          buyVolumesInSellTokens = price.denominator.times(auction.buyVolume).div(price.numerator)
          priceRelationshipPercentage = price.numerator
            .mul(closingPrice.denominator)
            .div(price.denominator)
            .div(closingPrice.numerator)
            .mul(100)
        }
        boughtPercentage = 100 - 100 * (auction.sellVolume - buyVolumesInSellTokens) / auction.sellVolume
      }
      if (state.indexOf('WAITING') === -1) {
        // Show outstanding volumen if we are not in a waiting period
        outstandingVolume = await this._auctionRepo.getOutstandingVolume({
          sellToken: tokenA,
          buyToken: tokenB,
          auctionIndex
        })
      }
    }

    return Object.assign({
      fundingInUSD: fundingInUSD.fundingA,
      price,
      closingPrice,
      buyVolumesInSellTokens,
      priceRelationshipPercentage,
      boughtPercentage,
      outstandingVolume
    }, auction)
  }

  async getAbout () {
    const auctionAbout = await this._auctionRepo.getAbout()
    const ethereumAbout = await this._ethereumRepo.getAbout()

    const config = {
      minimumSellVolume: this._minimumSellVolume,
      botAddress: this._botAddress,
      markets: this._markets
    }

    return {
      name: 'Dutch Exchange - Services',
      version: this._version,
      auctions: auctionAbout,
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
