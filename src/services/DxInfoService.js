const loggerNamespace = 'dx-service:services:DxInfoService'
// const Logger = require('../helpers/Logger')
// const logger = new Logger(loggerNamespace)
const AuctionLogger = require('../helpers/AuctionLogger')
const auctionLogger = new AuctionLogger(loggerNamespace)

const numberUtil = require('../helpers/numberUtil.js')

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

  async getAuctionIndex ({ sellToken, buyToken }) {
    return this._auctionRepo.getAuctionIndex({ sellToken, buyToken })
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

    // Get auction details for one of the auctions
    const auctionDetailPromises = []
    if (stateInfo.auction) {
      const getAuctionDetailsPromise = this._getAuctionDetails({
        auction: stateInfo.auction,
        tokenA: sellToken,
        tokenB: buyToken,
        auctionIndex,
        state
      }).then(auctionDetails => {
        result.auction = auctionDetails
      })
      auctionDetailPromises.push(getAuctionDetailsPromise)
    }

    // Get auction details for the other one
    if (stateInfo.auctionOpp) {
      const getAuctionDetailsPromise = this._getAuctionDetails({
        auction: stateInfo.auctionOpp,
        tokenA: buyToken,
        tokenB: sellToken,
        auctionIndex,
        state
      }).then(auctionDetails => {
        result.auctionOpp = auctionDetails
      })
      auctionDetailPromises.push(getAuctionDetailsPromise)
    }

    // If we have pending promises, we wait for them
    if (auctionDetailPromises.length > 0) {
      await Promise.all(auctionDetailPromises)
    }

    return result
  }

  async _getAuctionDetails ({ auction, tokenA, tokenB, auctionIndex, state }) {
    const {
      sellVolume,
      buyVolume,
      isClosed,
      isTheoreticalClosed,
      closingPrice
    } = auction

    const fundingInUSD = await this._auctionRepo.getFundingInUSD({
      tokenA, tokenB, auctionIndex
    })

    const price = await this._auctionRepo.getCurrentAuctionPrice({
      sellToken: tokenA,
      buyToken: tokenB,
      auctionIndex
    })

    let buyVolumesInSellTokens, priceRelationshipPercentage,
      boughtPercentage, outstandingVolume

    if (price) {
      if (price.numerator.isZero()) {
        // The auction runned for too long
        buyVolumesInSellTokens = sellVolume
      } else {
        // Get the number of sell tokens that we can get for the buyVolume
        buyVolumesInSellTokens = price.denominator
          .times(buyVolume)
          .div(price.numerator)

        // If we have a closing price, we compare the prices
        if (closingPrice) {
          priceRelationshipPercentage = price.numerator
            .mul(closingPrice.denominator)
            .div(price.denominator)
            .div(closingPrice.numerator)
            .mul(100)
        }
      }

      if (!sellVolume.isZero()) {
        // Get the bought percentage:
        //    100 - 100 * (sellVolume - soldTokens) / sellVolume
        const hundred = numberUtil.toBigNumber(100)
        boughtPercentage = hundred.minus(
          hundred.mul(
            sellVolume
              .minus(buyVolumesInSellTokens)
              .div(sellVolume)
          )
        )
      }

      if (closingPrice) {
        if (price.numerator.isZero()) {
          // The auction runned for too long
          buyVolumesInSellTokens = sellVolume
          priceRelationshipPercentage = null
        } else {
          // Get the number of sell tokens that we can get for the buyVolume
          buyVolumesInSellTokens = price.denominator
            .times(buyVolume)
            .div(price.numerator)

          priceRelationshipPercentage = price.numerator
            .mul(closingPrice.denominator)
            .div(price.denominator)
            .div(closingPrice.numerator)
            .mul(100)
        }
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

    return {
      sellVolume,
      buyVolume,
      isClosed,
      isTheoreticalClosed,
      closingPrice,
      price,
      fundingInUSD: fundingInUSD.fundingA,
      buyVolumesInSellTokens,
      priceRelationshipPercentage,
      boughtPercentage,
      outstandingVolume
    }
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

  /*
  async getAuctions ({ currencyA, currencyB }) {
    auctionLogger.debug({
      sellToken: currencyA,
      buyToken: currencyB,
      msg: 'Get auctions'
    })
    const auctionInfo = await this._auctionRepo.getStateInfo({
      sellToken: currencyA,
      buyToken: currencyB
    })
    const sellVolumeNext = await this._auctionRepo.getSellVolumeNext({
      sellToken: currencyA,
      buyToken: currencyB
    })

    return Object.assign({
      currencyA,
      currencyB,
      isAuctionRunning: this._isAuctionRunning(auctionInfo),
      sellVolumeNext
    }, auctionInfo)
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
  */

  async getCurrentPrice ({ sellToken, buyToken }) {
    auctionLogger.debug({ sellToken, buyToken, msg: 'Get current price' })

    const auctionIndex = await this._auctionRepo.getAuctionIndex({ sellToken, buyToken })
    return this._auctionRepo.getCurrentAuctionPrice({ sellToken, buyToken, auctionIndex })
  }

  async getBalances ({ accountAddress }) {
    return this._auctionRepo.getBalances({ accountAddress })
  }

  async getBalanceOfEther ({ account }) {
    return this._ethereumRepo.balanceOf({ account })
  }
}

module.exports = DxInfoService
