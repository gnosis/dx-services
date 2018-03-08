const loggerNamespace = 'dx-service:services:BotService'
// const Logger = require('../helpers/Logger')
// const logger = new Logger(loggerNamespace)
const AuctionLogger = require('../helpers/AuctionLogger')
const auctionLogger = new AuctionLogger(loggerNamespace)

const getGitInfo = require('../helpers/getGitInfo')
const getVersion = require('../helpers/getVersion')
const assert = require('assert')
const BigNumber = require('bignumber.js')

class BotService {
  constructor ({ auctionRepo, ethereumRepo, exchangePriceRepo, minimumSellVolume }) {
    this._auctionRepo = auctionRepo
    this._exchangePriceRepo = exchangePriceRepo
    this._ethereumRepo = ethereumRepo

    // Config
    this._minimumSellVolume = new BigNumber(minimumSellVolume)

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

  async testToDelete ({ tokenA, tokenB }) {
    return this._auctionRepo.getPrice({ tokenA, tokenB })
  }

  async ensureSellLiquidity ({ sellToken, buyToken, from }) {
    auctionLogger.debug(
      sellToken, buyToken,
      'Ensure that sell liquidity is over $%d',
      this._minimumSellVolume
    )
    assert(from, 'The "from" account is required')

    // Check if there's an ongoing liquidity check
    const lockName = `SELL-LIQUIDITY:${sellToken}-${buyToken}`
    let ensureLiquidityPromise = this.concurrencyCheck[lockName]
    if (ensureLiquidityPromise) {
      // We don't do concurrent liquidity checks
      return ensureLiquidityPromise
    } else {
      // Create lock
      this.concurrencyCheck[lockName] = ensureLiquidityPromise

      // Ensure liquidity
      ensureLiquidityPromise = this._doEnsureSellLiquidity({
        tokenA: sellToken,
        tokenB: buyToken,
        from
      })
    }

    return ensureLiquidityPromise
  }

  async _doEnsureSellLiquidity ({ tokenA, tokenB, from }) {
    const auction = { sellToken: tokenA, buyToken: tokenB }
    const [ auctionIndex, auctionStart ] = await Promise.all([
      this._auctionRepo.getAuctionIndex(auction),
      this._auctionRepo.getAuctionStart(auction)
    ])

    // Make sure the token pair has been added to the DX
    assert(auctionIndex > 0, `Unknown token pair: ${tokenA}-${tokenB}`)

    // Check if there is a start date
    let sellLiquidityResult
    if (auctionStart === null) {
      // We are in a waiting for funding period

      // Get the liquidity
      const { fundingA, fundingB } = await this._auctionRepo.getFundingInUSD({
        tokenA, tokenB, auctionIndex
      })

      // Check if we surprlus it
      if (
        fundingA.lessThan(this._minimumSellVolume) &&
        fundingB.lessThan(this._minimumSellVolume)
      ) {
        // Not enough liquidity
        auctionLogger.info(tokenA, tokenB,
          'Not enough liquidity for auction %d: %s=$%d, %s=$%d',
          auctionIndex, tokenA, fundingA, tokenB, fundingB
        )
        // Do sell in the correct auction
        sellLiquidityResult = await this._sellTokenToCreateLiquidity({
          tokenA, fundingA, tokenB, fundingB, auctionIndex, from
        })
      } else {
        // ERROR: Why there is no auctionStart if there is enough liquidity
        // It shouldn't happen (the liquidity criteria should be the same for the SC and the bots)
        throw new Error("There is enough liquidity but somehow there's no startDate for auction %d  %s-%s: %s: $%d, %s: $%d",
          auctionIndex, tokenA, tokenB, tokenA, fundingA, tokenB, fundingB
        )
      }
    } else {
      // Not sell is required
      auctionLogger.debug(tokenA, tokenB, `No sell is required, we are not in \
a waiting for funding state`)
      sellLiquidityResult = null
    }

    return sellLiquidityResult
  }

  async _sellTokenToCreateLiquidity ({ tokenA, fundingA, tokenB, fundingB, auctionIndex, from }) {
    // decide if we sell on the auction A-B or the B-A
    //  * We sell on the auction with more liquidity
    let sellToken, buyToken, amountToSellInUSD
    if (fundingA.lessThan(fundingB)) {
      // We sell in the B-A auction
      sellToken = tokenB
      buyToken = tokenA
      amountToSellInUSD = this._minimumSellVolume.minus(fundingB)
    } else {
      // We sell in the A-B auction
      sellToken = tokenA
      buyToken = tokenB
      amountToSellInUSD = this._minimumSellVolume.minus(fundingA)
    }

    // Get the amount to sell in sellToken
    const amountInSellTokens = await this._auctionRepo.getPriceFromUSDInTokens({
      token: sellToken,
      amount: amountToSellInUSD
    })

    // Sell the missing difference
    auctionLogger.info(sellToken, buyToken,
      'Selling %d %s ($%d)',
      amountInSellTokens.div(1e18), sellToken, amountToSellInUSD
    )
    await this._auctionRepo.postSellOrder({
      sellToken,
      buyToken,
      amount: amountInSellTokens,
      auctionIndex,
      from
    })

    return {
      sellToken,
      buyToken,
      amount: amountToSellInUSD
    }
  }
}

module.exports = BotService
