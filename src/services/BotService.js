const loggerNamespace = 'dx-service:services:BotService'
// const Logger = require('../helpers/Logger')
// const logger = new Logger(loggerNamespace)
const AuctionLogger = require('../helpers/AuctionLogger')
const auctionLogger = new AuctionLogger(loggerNamespace)

const getGitInfo = require('../helpers/getGitInfo')
const getVersion = require('../helpers/getVersion')
const assert = require('assert')
const BigNumber = require('bignumber.js')
const MAXIMUM_DX_FEE = 0.05 // 5%

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
    const auctionInfo = await this._auctionRepo.getAbout()
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

  async ensureBuyLiquidity ({ sellToken, buyToken, from }) {
    auctionLogger.debug({
      sellToken,
      buyToken,
      msg: 'Ensure the buy liquidity'
    })

    return null
  }

  async ensureSellLiquidity ({ sellToken, buyToken, from }) {
    auctionLogger.debug({
      sellToken,
      buyToken,
      msg: 'Ensure that sell liquidity is over $%d',
      params: [ this._minimumSellVolume ]
    })
    assert(from, 'The "from" account is required')

    const lockName = this._getAuctionLockName('SELL-LIQUIDITY', sellToken, buyToken)

    // Check if there's an ongoing liquidity check
    if (this.concurrencyCheck[lockName]) {
      // We don't do concurrent liquidity checks
      // return that there was no need to sell (returns "null")
      auctionLogger.warn({
        sellToken,
        buyToken,
        msg: `There is a concurrent liquidity check going on, so no aditional \
check should be done`
      })
      return Promise.resolve(null)
    } else {
      // Ensure liquidity + Create concurrency lock
      this.concurrencyCheck[lockName] = this
        // Do ensure liquidiy
        ._doEnsureSellLiquidity({
          tokenA: sellToken,
          tokenB: buyToken,
          from
        })
        .then(result => {
          // Success
          // Clear concurrency lock and resolve proise
          this.concurrencyCheck[lockName] = null
          return result
        })
        .catch(error => {
          // Error
          // Clear concurrency and reject promise
          this.concurrencyCheck[lockName] = null
          throw error
        })
      return this.concurrencyCheck[lockName]
    }
  }

  async getBalances ({ tokens, address }) {
    const balancesPromises = tokens.map(async token => {
      const amount = await this._auctionRepo.getBalance({ token, address })
      const anmountInUSD = await this._auctionRepo.getPriceInUSD({
        token,
        amount
      })
      return {
        token, amount, anmountInUSD
      }
    })

    return Promise.all(balancesPromises)
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
        auctionLogger.info({
          sellToken: tokenA,
          buyToken: tokenB,
          msg: 'Not enough liquidity for auction %d: %s=$%d, %s=$%d',
          params: [ auctionIndex, tokenA, fundingA, tokenB, fundingB ],
          notify: true
        })
        // Do sell in the correct auction
        sellLiquidityResult = await this._sellTokenToCreateLiquidity({
          tokenA, fundingA, tokenB, fundingB, auctionIndex, from
        })
      } else {
        // ERROR: Why there is no auctionStart if there is enough liquidity
        // It shouldn't happen (the liquidity criteria should be the same for the SC and the bots)
        throw new Error(`There is enough liquidity but somehow there's no \
startDate for auction ${auctionIndex}: ${tokenA}: ${fundingA}\
${tokenB}: ${fundingB}. It might be a concurrency issue. Check if the error \
keeps happening`
        )
      }
    } else {
      // Not sell is required
      auctionLogger.debug({
        sellToken: tokenA,
        buyToken: tokenB,
        msg: `No sell is required, we are not in a waiting for funding state`
      })
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

    // We round up the dollars
    amountToSellInUSD = amountToSellInUSD
      // We add the maximun fee as an extra amount
      .mul(1 + MAXIMUM_DX_FEE)
      // Round USD to 2 decimals
      .mul(100)
      .ceil()
      .div(100)

    // Get the amount to sell in sellToken
    const amountInSellTokens = (await this._auctionRepo
      .getPriceFromUSDInTokens({
        token: sellToken,
        amountOfUsd: amountToSellInUSD
      }))
      // Round up
      .ceil()

    // Sell the missing difference
    auctionLogger.info({
      sellToken,
      buyToken,
      msg: 'Selling %d %s ($%d)',
      params: [ amountInSellTokens.div(1e18), sellToken, amountToSellInUSD ]
    })
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
      amount: amountInSellTokens,
      amountInUSD: amountToSellInUSD
    }
  }

  _getAuctionLockName (operation, sellToken, buyToken) {
    const sufix = sellToken < buyToken ? sellToken + '-' + buyToken : buyToken + '-' + sellToken

    return operation + sufix
  }
}

module.exports = BotService
