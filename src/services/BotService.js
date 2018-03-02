const debug = require('debug')('dx-service:services:BotService')
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
    debug('Ensure that sell liquidity on %s-%s markets is over $%d',
      sellToken, buyToken,
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
      const { foundingA, foundingB } = await this._auctionRepo.getFundingInUSD({
        tokenA, tokenB, auctionIndex
      })

      // Check if we surprlus it
      if (
        foundingA.lessThan(this._minimumSellVolume) &&
        foundingB.lessThan(this._minimumSellVolume)
      ) {
        // Not enough liquidity
        debug('Not enough liquidity for auction %d of %s-%s: %s=$%d, %s=$%d',
          auctionIndex, tokenA, tokenB, tokenA, foundingA, tokenB, foundingB
        )
        // Do sell in the correct auction
        sellLiquidityResult = await this._sellTokenToCreateLiquidity({
          tokenA, foundingA, tokenB, foundingB, auctionIndex, from
        })
      } else {
        // ERROR: Why there is no auctionStart if there is enough liquidity
        // It shouldn't happen (the liquidity criteria should be the same for the SC and the bots)
        throw new Error("There is enough liquidity but somehow there's no startDate for auction %d  %s-%s: %s: $%d, %s: $%d",
          auctionIndex, tokenA, tokenB, tokenA, foundingA, tokenB, foundingB
        )
      }
    } else {
      // Not sell is required
      debug(`No sell is required, we are not in a waiting for funding state for \
${tokenA} ${tokenB}`)
      sellLiquidityResult = null
    }

    return sellLiquidityResult
  }

  async _sellTokenToCreateLiquidity ({ tokenA, foundingA, tokenB, foundingB, auctionIndex, from }) {
    // decide if we sell on the auction A-B or the B-A
    //  * We sell on the auction with less liquidity
    let sellToken, buyToken, amountToSellInUSD
    if (foundingA.lessThan(foundingB)) {
      // We sell in the B-A auction
      sellToken = tokenB
      buyToken = tokenA
      amountToSellInUSD = this._minimumSellVolume.minus(foundingB)
    } else {
      // We sell in the A-B auction
      sellToken = tokenA
      buyToken = tokenB
      amountToSellInUSD = this._minimumSellVolume.minus(foundingA)
    }

    // Get the amount to sell in sellToken
  
    // closing price (tokenBuy / tokenSell )
    const amountInSellTokens = await this._auctionRepo.getPriceFromUSDInTokens({
      token: sellToken,
      amount: amountToSellInUSD
    })

    // Sell the missing difference
    debug('Selling %d %s ($%d) in the %s-%s auction',
      amountInSellTokens, sellToken, amountToSellInUSD, sellToken, buyToken
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
