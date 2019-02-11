const loggerNamespace = 'dx-service:services:LiquidityService'
const AuctionLogger = require('../../helpers/AuctionLogger')
const auctionLogger = new AuctionLogger(loggerNamespace)

const getGitInfo = require('../../helpers/getGitInfo')
const getVersion = require('../../helpers/getVersion')
const numberUtil = require('../../helpers/numberUtil.js')
const formatUtil = require('../../helpers/formatUtil.js')
const assert = require('assert')

const MAXIMUM_DX_FEE = 0.005 // 0.5%
const WAIT_TO_RELEASE_SELL_LOCK_MILLISECONDS = process.env.WAIT_TO_RELEASE_SELL_LOCK_MILLISECONDS || (2 * 60 * 1000) // 2 min

class LiquidityService {
  constructor ({
    // repos
    arbitrageRepo,
    auctionRepo,
    ethereumRepo,
    priceRepo,

    // config
    buyLiquidityRulesDefault
  }) {
    assert(arbitrageRepo, '"arbitrageRepo" is required')
    assert(auctionRepo, '"auctionRepo" is required')
    assert(ethereumRepo, '"ethereumRepo" is required')
    assert(priceRepo, '"priceRepo" is required')
    assert(buyLiquidityRulesDefault, '"buyLiquidityRulesDefault" is required')

    this._arbitrageRepo = arbitrageRepo
    this._auctionRepo = auctionRepo
    this._priceRepo = priceRepo
    this._ethereumRepo = ethereumRepo

    // Config
    this._buyLiquidityRules = buyLiquidityRulesDefault

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
      minimumSellVolume: await this._auctionRepo.getThresholdNewAuction()
    }, auctionInfo)

    return {
      name: 'Dutch Exchange - API',
      version: this._version,
      config,
      git: this._gitInfo
    }
  }

  async ensureBuyLiquidity ({ sellToken, buyToken, from, buyLiquidityRules, waitToReleaseTheLock = false }) {
    return this._ensureLiquidityAux({
      sellToken,
      buyToken,
      from,
      buyLiquidityRules,
      waitToReleaseTheLock,
      liquidityCheckName: 'buy'
    })
  }

  async ensureArbitrageLiquidity ({ sellToken, buyToken, from, buyLiquidityRules, waitToReleaseTheLock = false }) {
    return this._ensureLiquidityAux({
      sellToken,
      buyToken,
      from,
      buyLiquidityRules,
      waitToReleaseTheLock,
      liquidityCheckName: 'arbitrage'
    })
  }

  async ensureSellLiquidity ({ sellToken, buyToken, from, waitToReleaseTheLock = true }) {
    return this._ensureLiquidityAux({
      sellToken,
      buyToken,
      from,
      liquidityCheckName: 'sell',
      waitToReleaseTheLock
    })
  }

  async _ensureLiquidityAux ({ sellToken, buyToken, from, buyLiquidityRules, liquidityCheckName, waitToReleaseTheLock }) {
    // Define some variables to refacor sell/buy liquidity checks
    let boughtOrSoldTokensPromise, doEnsureLiquidityFnName, baseLockName,
      messageCurrentCheck, paramsCurrentCheck
    if (liquidityCheckName === 'sell') {
      const minimumSellVolume = await this._auctionRepo.getThresholdNewAuction()

      doEnsureLiquidityFnName = '_doEnsureSellLiquidity'
      baseLockName = 'SELL-LIQUIDITY'
      messageCurrentCheck = 'Ensure that sell liquidity is over $%d'
      paramsCurrentCheck = [minimumSellVolume]
    } else if (liquidityCheckName === 'buy') {
      doEnsureLiquidityFnName = '_doEnsureBuyLiquidity'
      baseLockName = 'BUY-LIQUIDITY'
      messageCurrentCheck = 'Ensure that buy liquidity is met'
      paramsCurrentCheck = undefined
    } else if (liquidityCheckName === 'arbitrage') {
      doEnsureLiquidityFnName = '_doEnsureArbitrageLiquidity'
      baseLockName = 'ARBITRAGE-LIQUIDITY'
      messageCurrentCheck = 'Ensure that market is arbitraged'
      paramsCurrentCheck = undefined
    } else {
      throw new Error('No known liquidity check named: ' + liquidityCheckName)
    }

    assert(from, 'The "from" account is required')

    auctionLogger.debug({
      sellToken,
      buyToken,
      msg: messageCurrentCheck,
      params: paramsCurrentCheck
    })

    const lockName = this._getAuctionLockName(baseLockName, sellToken, buyToken, from)

    const that = this
    const releaseLock = soldOrBoughtTokens => {
      // Clear concurrency lock and resolve proise
      const isError = soldOrBoughtTokens instanceof Error
      // TODO: Review

      if (isError || soldOrBoughtTokens.length === 0 || !waitToReleaseTheLock) {
        that.concurrencyCheck[lockName] = null
      } else {
        setTimeout(() => {
          that.concurrencyCheck[lockName] = null
        }, WAIT_TO_RELEASE_SELL_LOCK_MILLISECONDS)
      }

      if (isError) {
        // Error
        throw soldOrBoughtTokens
      } else {
        // Success
        return soldOrBoughtTokens
      }
    }

    // Check if there's an ongoing liquidity check
    if (this.concurrencyCheck[lockName]) {
      // We don't do concurrent liquidity checks
      // return that there was no need to sell/buy (empty array of orders)
      auctionLogger.warn({
        sellToken,
        buyToken,
        msg: `There is a concurrent %s check going on, so no aditional \
check should be done`,
        params: [liquidityCheckName]
      })
      boughtOrSoldTokensPromise = Promise.resolve([])
    } else {
      // Ensure liquidity + Create concurrency lock
      this.concurrencyCheck[lockName] = this[doEnsureLiquidityFnName]({
        tokenA: sellToken,
        tokenB: buyToken,
        from,
        buyLiquidityRules
      })
      boughtOrSoldTokensPromise = this.concurrencyCheck[lockName]
      boughtOrSoldTokensPromise
        .then(releaseLock)
        .catch(releaseLock)
    }

    return boughtOrSoldTokensPromise
  }

  async getBalances ({ tokens, address }) {
    const balancesPromises = tokens.map(async token => {
      const amount = await this._auctionRepo.getBalance({ token, address })
      let amountInUSD = await this._auctionRepo
        .getPriceInUSD({
          token,
          amount
        })

      // Round USD to 2 decimals
      amountInUSD = numberUtil.roundDown(amountInUSD)

      return {
        token, amount, amountInUSD
      }
    })

    return Promise.all(balancesPromises)
  }

  async _doEnsureSellLiquidity ({ tokenA, tokenB, from }) {
    const soldTokens = []
    const auction = { sellToken: tokenA, buyToken: tokenB }
    const [auctionIndex, auctionStart] = await Promise.all([
      this._auctionRepo.getAuctionIndex(auction),
      this._auctionRepo.getAuctionStart(auction)
    ])

    // Make sure the token pair has been added to the DX
    assert(auctionIndex > 0, `Unknown token pair: ${tokenA}-${tokenB}`)

    // Check if there is a start date
    if (auctionStart === null) {
      // We are in a waiting for funding period

      // Get the liquidity and minimum sell volume
      const [{ fundingA, fundingB }, minimumSellVolume] = await Promise.all([
        this._auctionRepo.getFundingInUSD({
          tokenA, tokenB, auctionIndex
        }),
        this._auctionRepo.getThresholdNewAuction()
      ])

      // Check if we surplus it
      if (
        fundingA.lessThan(minimumSellVolume) ||
        fundingB.lessThan(minimumSellVolume)
      ) {
        // Not enough liquidity
        auctionLogger.info({
          sellToken: tokenA,
          buyToken: tokenB,
          msg: 'Not enough liquidity for auction %d: %s=$%d, %s=$%d',
          params: [auctionIndex, tokenA, fundingA, tokenB, fundingB],
          notify: true
        })

        let soldTokenAB, soldTokenBA
        // Ensure liquidity for both sides or the side that needs it
        if (fundingA.lessThan(minimumSellVolume)) {
          soldTokenAB = await this._sellTokenToCreateLiquidity({
            sellToken: tokenA,
            buyToken: tokenB,
            funding: fundingA,
            auctionIndex,
            from
          })
          soldTokens.push(soldTokenAB)
        }
        if (fundingB.lessThan(minimumSellVolume)) {
          soldTokenBA = await this._sellTokenToCreateLiquidity({
            sellToken: tokenB,
            buyToken: tokenA,
            funding: fundingB,
            auctionIndex,
            from
          })
          soldTokens.push(soldTokenBA)
        }
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
    }

    return soldTokens
  }

  async _doEnsureBuyLiquidity ({ tokenA, tokenB, from, buyLiquidityRules }) {
    const buyLiquidityResult = []
    const auction = { sellToken: tokenA, buyToken: tokenB }
    const auctionIndex = await this._auctionRepo.getAuctionIndex(auction)

    // Make sure the token pair has been added to the DX
    assert(auctionIndex > 0, `Unknown token pair: ${tokenA}-${tokenB}`)

    const [soldTokensA, soldTokensB] = await Promise.all([
      // tokenA-tokenB: Get soldTokens
      this._getPricesAndEnsureLiquidity({
        sellToken: tokenA,
        buyToken: tokenB,
        auctionIndex,
        from,
        buyLiquidityRules
      }),

      // tokenB-tokenA: Get soldTokens
      this._getPricesAndEnsureLiquidity({
        sellToken: tokenB,
        buyToken: tokenA,
        auctionIndex,
        from,
        buyLiquidityRules
      })
    ])

    if (soldTokensA) {
      buyLiquidityResult.push(soldTokensA)
    }
    if (soldTokensB) {
      buyLiquidityResult.push(soldTokensB)
    }

    return buyLiquidityResult
  }

  async _doEnsureArbitrageLiquidity ({ tokenA, tokenB, from, buyLiquidityRules }) {
    const results = []
    const auction = { sellToken: tokenA, buyToken: tokenB }

    // trigger arbitrage by token and amount
    // on dutch opportunity
    // on uniswap opportunity

    const auctionIndex = await this._auctionRepo.getAuctionIndex(auction)
    // Make sure the token pair has been added to the DX
    assert(auctionIndex > 0, `Unknown token pair: ${tokenA}-${tokenB}`)

    // tokenA-tokenB: Get soldTokens
    const soldTokensA = await this._getPricesAndAttemptArbitrage({
      sellToken: tokenA,
      buyToken: tokenB,
      auctionIndex,
      from,
      buyLiquidityRules
    })

    // tokenB-tokenA: Get soldTokens
    const soldTokensB = await this._getPricesAndAttemptArbitrage({
      sellToken: tokenB,
      buyToken: tokenA,
      auctionIndex,
      from,
      buyLiquidityRules
    })


    if (soldTokensA) {
      results.push(soldTokensA)
    }
    if (soldTokensB) {
      results.push(soldTokensB)
    }

    return results
  }

  async _getPricesAndAttemptArbitrage ({ buyToken, sellToken, auctionIndex, from, buyLiquidityRules }) {
    const auctionState = await this._auctionRepo.getAuctionState({
      sellToken,
      buyToken,
      auctionIndex
    })
    // If the current auction is not cleared (not price + has)
    const {
      sellVolume,
      isClosed,
      isTheoreticalClosed
    } = auctionState

    // // We need to check arbitrage opportunity if:
    // //  * The auction has sell volume
    // //  * Is not closed yet
    // //  * Is not in theoretical closed state
    if (!sellVolume.isZero()) {
      if (!isClosed && !isTheoreticalClosed) {
        console.log('real attempt')
        // first we detect which of our tokens is the ether Token
        const { etherToken } = this._arbitrageRepo.whichTokenIsEth(buyToken, sellToken)

        // next we check our arbitrage contract's ether balance
        // to see what the maximum amount we can spend is
        const arbitrageAddress = this._arbitrageRepo.getArbitrageAddress()
        let maxToSpend = await this._auctionRepo.getBalance({
          token: etherToken,
          address: arbitrageAddress
        })

        // specify maxTospend as factor of ether when buying tokens

        // now we get the current price for our token pair on the dutch x
        const {
          numerator, // buyVolumes[sellToken][buyToken]
          denominator // sellVolumesCurrent[sellToken][buyToken]
        } = await this._auctionRepo.getCurrentAuctionPrice({
          sellToken,
          buyToken,
          auctionIndex,
          from
        })


        // we know the current dutch price but the current uniswap price will depend
        // on the size of the trade being made. For this reason use the ether_balance
        // and token_balance to iterate over different input amounts to see if we can
        // find an opportunity for arbitrage

        // now we get the current state of the uniswap exchange for our token pair
        const {
          ether_balance,
          token_balance
        } = await this._arbitrageRepo.getUniswapBalances({ buyToken, sellToken })

        console.log('ether_balance', ether_balance.toString(10), 'token_balance', token_balance.toString(10))
        console.log('price', ether_balance.div(token_balance).toString(10), 'price2', token_balance.div(ether_balance).toString(10))

        // We are the buyer. If the buyer token is ether, the seller token is a real token.
        // If we want some real token from the DutchX, it means there is an opporunity to sell
        // on uniswap at a greater price in Ether. this would be an opportunity on the dutchX.
        // a dutchOpportunity...
        // vvvvvvvvvv
        let dutchPrice
        dutchPrice = numerator / denominator
        dutchPrice = numberUtil.toBigNumber(dutchPrice)



        if (buyToken === etherToken) {
          // dutchPrice = denominator / numerator

          console.log('DUTCH OPP')
          // dutchOpportunity
          maxToSpend = numberUtil.toBigNumber(maxToSpend).mul(dutchPrice)
          // smallest increment of token to spend on uniswap after purchase on dutchX
          // we'll use this to check for the best possible price on uniswap
          // if we were to spend minimumSpend tokens on uniswap, what price would we get?
          // if this price is greater than the dutch price, we'll have a dutch opportunity
          const minimumSpend = 1
          assert(sellVolume > minimumSpend, 'Not enough sell volume to execute minimum spend')

          // this is the maximum amount of ether we should spend on this opportunity to make a profit
          let amount = this.getSpendAmount({
            dutchPrice,
            minimumSpend,
            maxToSpend,
            // input_token: sellToken,
            input_balance: numberUtil.toBigNumber(token_balance), // sell token balance
            output_balance: numberUtil.toBigNumber(ether_balance), // buy token balance
            buyOnDutch: true
          })
          // if the amount to spend is 0 there is no opportunity
          // otherwise execute the opportunity
          if (!amount.eq(0) ){
            let uniswapExpected = await this._arbitrageRepo.getTokenToEthInputPrice(sellToken, amount.toString(10))
            amount = amount.div(dutchPrice)

            console.log('amount: ', amount.toString(10))
            console.log('uniswapExpected: ', uniswapExpected.toString(10))
            console.log('price', uniswapExpected.mul(amount).toString(10))
            console.log('price', amount.div(uniswapExpected).toString(10))
            return
            // return this._arbitrageRepo.dutchOpportunity({
            //   arbToken: sellToken,
            //   amount: amount.toString(10),
            //   from
            // })
          } else {
            console.log('amount = 0')
          }

        // We are the buyer. If the seller token is ether, our buyer token is a real token. We use the
        // buyer token to get etherToken from the dutchX. If we want ether from DutchX, it means
        // we would have bought some token cheaply from uniswap. This would have been an opportunity on uniswap.
        // a uniswapOpportunity...
        // vvvvvvvvvv
        } else if (sellToken === etherToken) {
          console.log('UNI OPP')
          // dutchPrice = numerator / denominator
          maxToSpend = numberUtil.toBigNumber(maxToSpend)
          // uniswapOpporunity

          // smallest increment of ether to spend on uniswap before purchase on dutchX
          // we'll use this to check for the best possible price on uniswap
          // if we were to spend minimumSpend ether on uniswap, what price would we get?
          // if this price is less than the dutch price, we'll have a uniswap opportunity
          const minimumSpend = 1 // should this be the gas execution amount? so that the trade will at least pay for the gas it costs to execute?
          assert(sellVolume > minimumSpend, 'Not enough sell volume to execute minimum spend')

          // this is the maximum amount of ether we should spend on this opportunity to make a profit
          let amount = this.getSpendAmount({
            dutchPrice,
            minimumSpend,
            maxToSpend,
            // input_token: sellToken,
            input_balance: numberUtil.toBigNumber(ether_balance), // sell token balance
            output_balance: numberUtil.toBigNumber(token_balance), // buy token balance
            buyOnDutch: false
          })
          // if the amount to spend is 0 there is no opportunity
          // otherwise execute the opportunity
          if (!amount.eq(0)) {
            console.log('amount: ', amount.toString(10))

            // let uniswapExpected = await this._arbitrageRepo.getEthToTokenInputPrice(buyToken, amount.toString(10))
            let uniswapExpected = await this._arbitrageRepo.getTokenToEthInputPrice(buyToken, amount.toString(10))
            amount = uniswapExpected
            console.log('uniswapExpected: ', uniswapExpected.toString(10))
            console.log('price', uniswapExpected.div(amount).toString(10))
            console.log('price', amount.div(uniswapExpected).toString(10))
            return this._arbitrageRepo.uniswapOpportunity({
              arbToken: buyToken,
              amount,
              from
            })
          } else {
            console.log('amount = 0')
          }
        } else {
          console.log('no opportunity')
        }
        // this will be reached if the amount returned from getSpendAmount was 0 on either opportunity
        auctionLogger.info({
          sellToken,
          buyToken,
          msg: 'No arbitrage opportunity'
        })
      } else {
        // The auction is CLOSED or THEORETICALY CLOSED
        auctionLogger.info({
          sellToken,
          buyToken,
          msg: 'The auction is already closed: %o',
          params: [{
            isTheoreticalClosed,
            isClosed
          }]
        })
      }
    } else {
      // No sell volume
      auctionLogger.info({
        sellToken,
        buyToken,
        msg: "The auction doesn't have any sell volume, so there's nothing to buy"
      })
    }
  }

  // adapted from uniswapExchange Vyper Contract
  getInputPrice (input_amount, input_reserve, output_reserve) {
    assert(input_reserve.gt(0), 'Input reserve must be greater than 0')
    assert(output_reserve.gt(0), 'Input reserve must be greater than 0')
    const input_amount_with_fee = input_amount.mul(997)
    const numerator = input_amount_with_fee.mul(output_reserve)
    const denominator = input_reserve.mul(1000).add(input_amount_with_fee)
    return numerator.div(denominator)
  }

  getSpendAmount ({
    // input_token,
    maxToSpend,
    input_balance,
    output_balance,
    dutchPrice,
    buyOnDutch,
    minimumSpend
  }) {
    // these must be positive amounts.
    // it is also worth considering making the small increment rather large
    // because if it is too precise, the profit margin may disappear between the time it is
    // calculated and actually execute. The dutch X price would improve, but the increased
    // purchase amount might actually create too much slippage on uniswap, possibly destroying the profit
    const spendIncrementSmall = 1e16
    const spendIncrementLarge = 1e18

    let output_returned = 0

    let input_amount = numberUtil.toBigNumber(minimumSpend)

    let useLargeIncrement = true
    let finalPrice = false
    let opportunity = false

    // check to see if there is an opportunity even if you input the smallest amount

    output_returned = this.getInputPrice(input_amount, input_balance, output_balance)
    let uniswapPrice = output_returned.div(input_amount)
    console.log('first', 'amount: ' + input_amount.toString(10), 'uni: ' + uniswapPrice.toString(10), 'dutch:' + dutchPrice.toString(10))
    if (dutchPrice.lte(uniswapPrice)) {
      opportunity = true
    }

    if (!opportunity) {
      return numberUtil.toBigNumber(0)
    }

    // want to loop through larger and larger spending increments
    // until maxToSpend is hit or until the price is no longer an opportunity
    // this asks: what's the largest amount i can buy on uniswap
    // while still getting a better price than the dutchX
    while (!finalPrice) {
      if (input_amount.gt(maxToSpend) || !opportunity) {
        if (useLargeIncrement) {
          console.log('still using large increment, lets reduce by increment large and try again using small increment')
          useLargeIncrement = false
          opportunity = true
          input_amount = input_amount.sub(spendIncrementLarge)
          continue
        } else {
          console.log('now using small increment, lets reduce by increment small and try return')
          input_amount = input_amount.sub(spendIncrementSmall)
          finalPrice = true
          output_returned = this.getInputPrice(input_amount, input_balance, output_balance)
          uniswapPrice = output_returned.div(input_amount)
          console.log('FINAL', 'amount: ' + input_amount.toString(10), 'uni: ' + uniswapPrice.toString(10), 'dutch:' + dutchPrice.toString(10))
          return input_amount
        }
      }
      output_returned = this.getInputPrice(input_amount, input_balance, output_balance)
      uniswapPrice = output_returned.div(input_amount)
      console.log('seubsequent', 'amount: ' + input_amount.toString(10), 'uni: ' + uniswapPrice.toString(10), 'dutch:' + dutchPrice.toString(10))
      if (dutchPrice.gt(uniswapPrice)) {
        opportunity = false
      } else {
        input_amount = input_amount.add(useLargeIncrement ? spendIncrementLarge : spendIncrementSmall)
      }
    }
  }

  async _getPricesAndEnsureLiquidity ({ sellToken, buyToken, auctionIndex, from, buyLiquidityRules }) {
    auctionLogger.debug({
      sellToken,
      buyToken,
      msg: 'auctionIndex: %d, from: %s',
      params: [auctionIndex, from]
    })
    const auctionState = await this._auctionRepo.getAuctionState({
      sellToken,
      buyToken,
      auctionIndex
    })
    // If the current auction is not cleared (not price + has)
    const {
      sellVolume,
      isClosed,
      isTheoreticalClosed
    } = auctionState

    auctionLogger.debug({
      sellToken,
      buyToken,
      msg: 'State of the auction: %o',
      params: [{ sellVolume: sellVolume.toNumber(), isClosed, isTheoreticalClosed }]
    })

    // We do need to ensure the liquidity if:
    //  * The auction has sell volume
    //  * Is not closed yet
    //  * Is not in theoretical closed state
    if (!sellVolume.isZero()) {
      if (!isClosed && !isTheoreticalClosed) {
        const [price, currentMarketPrice] = await Promise.all([
          // Get the current price for the auction
          this._auctionRepo.getCurrentAuctionPrice({
            sellToken,
            buyToken,
            auctionIndex,
            from
          }),

          // Get the market price
          this._priceRepo.getPrice({
            tokenA: sellToken,
            tokenB: buyToken
          }).then(price => ({
            numerator: numberUtil.toBigNumber(price.toString()),
            denominator: numberUtil.ONE
          }))
        ])
        assert(currentMarketPrice, `There is no market price for ${sellToken}-${buyToken}`)

        auctionLogger.debug({
          sellToken,
          buyToken,
          msg: 'Price: %s, Market price: %s',
          params: [formatUtil.formatFraction(price), formatUtil.formatFraction(currentMarketPrice)]
        })
        if (price) {
          // If there is a price, the auction is running
          return this._doBuyLiquidityUsingCurrentPrices({
            sellToken,
            buyToken,
            auctionIndex,
            from,
            buyLiquidityRules,
            currentMarketPrice: currentMarketPrice,
            price: price,
            auctionState
          })
        }
      } else {
        // The auction is CLOSED or THEORETICALY CLOSED
        auctionLogger.debug({
          sellToken,
          buyToken,
          msg: 'The auction is already closed: %o',
          params: [{
            isTheoreticalClosed,
            isClosed
          }]
        })
      }
    } else {
      // No sell volume
      auctionLogger.debug({
        sellToken,
        buyToken,
        msg: "The auction doesn't have any sell volume, so there's nothing to buy"
      })
    }
  }

  // async _getCurrentAuctionPrice ({ sellToken, buyToken, auctionIndex, from }) {
  //   // Get the current price for the auction
  //   let price = await this._auctionRepo.getCurrentAuctionPrice({
  //     sellToken, buyToken, auctionIndex, from
  //   })

  //   // The auction may be running and not having price, this is because:
  //   //   - just one of the oposit auctions is running
  //   //   - We asked for the price of the not-running one
  //   if (price == null) {
  //     // We get the opposit price and return the inverse
  //     const priceOpp = await this._auctionRepo.getCurrentAuctionPrice({
  //       sellToken: buyToken,
  //       buyToken: sellToken,
  //       auctionIndex,
  //       from
  //     })

  //     if (priceOpp !== null) {
  //       price = {
  //         numerator: priceOpp.denominator,
  //         denominator: priceOpp.numerator
  //       }
  //     } else {
  //       price = null
  //     }
  //   }

  //   return price
  // }

  async _doBuyLiquidityUsingCurrentPrices ({
    sellToken,
    buyToken,
    auctionIndex,
    from,
    buyLiquidityRules,
    currentMarketPrice,
    price,
    auctionState
  }) {
    const rules = (buyLiquidityRules || this._buyLiquidityRules).map(({ marketPriceRatio, buyRatio }) => ({
      marketPriceRatio: formatUtil.formatFraction(marketPriceRatio),
      buyRatio: formatUtil.formatFraction(buyRatio)
    }))
    auctionLogger.debug({
      sellToken,
      buyToken,
      msg: 'Do ensure liquidity for auction %d. Rules: %o',
      params: [auctionIndex, rules]
    })

    let buyLiquidityOperation = null

    // Get the percentage that should be bought
    const percentageThatShouldBeBought = this._getPercentageThatShouldBeBought({
      buyLiquidityRules,
      currentMarketPrice,
      price
    })

    if (!percentageThatShouldBeBought.isZero()) {
      // Get the buy volume, and the expected buyVolume
      const { buyVolume, sellVolume } = auctionState

      // We make sure there's sell volume (otherwise there's nothing to buy)
      auctionLogger.info({
        sellToken,
        buyToken,
        msg: 'We need to ensure that %d % of the buy volume is bought. Market Price: %s, Price: %s, Relation: %d %',
        params: [
          percentageThatShouldBeBought.mul(100).toFixed(2),
          formatUtil.formatFraction(currentMarketPrice),
          formatUtil.formatFraction(price),
          _getPriceRatio(price, currentMarketPrice)
            .mul(100)
            .toFixed(2)
        ]
      })

      // Get the total sellVolume in buy tokens
      const sellVolumeInBuyTokes = sellVolume
        .mul(price.numerator)
        .div(price.denominator)

      // Get the buyTokens that should have been bought
      const expectedBuyVolume = percentageThatShouldBeBought
        .mul(sellVolumeInBuyTokes)

      // Get the difference between the buyVolume and the buyVolume that we
      // should have
      const buyTokensRequiredToMeetLiquidity = expectedBuyVolume
        .minus(buyVolume)
        .ceil()

      // (1 - (sellVolumeInBuyTokes - buyVolume / sellVolumeInBuyTokes)) * 100
      const boughtPercentage = numberUtil
        .ONE.minus(
          sellVolumeInBuyTokes
            .minus(buyVolume)
            .div(sellVolumeInBuyTokes)
        ).mul(100)

      // Decide if we need to meet the liquidity
      const needToEnsureLiquidity = buyTokensRequiredToMeetLiquidity.greaterThan(0)

      if (needToEnsureLiquidity) {
        const buyTokensWithFee = buyTokensRequiredToMeetLiquidity
          .div(numberUtil.ONE.minus(MAXIMUM_DX_FEE))

        const remainPercentage = percentageThatShouldBeBought
          .mul(100)
          .minus(boughtPercentage)

        auctionLogger.info({
          sellToken,
          buyToken,
          msg: 'The auction has %d % of the buy volume bought. So we need to buy an extra %d %',
          params: [
            boughtPercentage.toFixed(2),
            remainPercentage.toFixed(2)
          ]
        })

        // Get the price in USD for the tokens we are buying
        const amountToBuyInUSD = await this._auctionRepo.getPriceInUSD({
          token: buyToken,
          amount: buyTokensWithFee
        })

        // We need to ensure liquidity
        // Sell the missing difference
        auctionLogger.info({
          sellToken,
          buyToken,
          msg: 'Posting a buy order for %d %s ($%d)',
          params: [buyTokensWithFee.div(1e18), buyToken, amountToBuyInUSD]
        })
        const buyOrder = await this._auctionRepo.postBuyOrder({
          sellToken,
          buyToken,
          amount: buyTokensWithFee,
          auctionIndex,
          from
        })
        auctionLogger.info({
          sellToken,
          buyToken,
          msg: 'Posted a buy order. Transaction: %s',
          params: [buyOrder.tx]
        })

        buyLiquidityOperation = {
          sellToken,
          buyToken,
          auctionIndex,
          amount: buyTokensWithFee,
          amountInUSD: amountToBuyInUSD
        }
      } else {
        // We meet the liquidity
        auctionLogger.debug({
          sellToken,
          buyToken,
          msg: 'The auction has %d % of the buy volume bought. So we are good',
          params: [
            boughtPercentage.toFixed(2)
          ]
        })
      }
    }

    return buyLiquidityOperation
  }

  _getPercentageThatShouldBeBought ({ buyLiquidityRules, currentMarketPrice, price }) {
    // Get the relation between prices
    //  priceRatio = (Pn * Cd) / (Pd * Cn)
    const priceRatio = _getPriceRatio(price, currentMarketPrice)

    const rules = (buyLiquidityRules || this._buyLiquidityRules)
      // Transform fractions to bigdecimals
      .map(threshold => ({
        marketPriceRatio: numberUtil
          .toBigNumberFraction(threshold.marketPriceRatio),
        buyRatio: numberUtil
          .toBigNumberFraction(threshold.buyRatio)
      }))
      // Sort the thresholds by buyRatio (in descendant order)
      .sort((thresholdA, thresholdB) => {
        return thresholdB.buyRatio.comparedTo(thresholdA.buyRatio)
      })

    // Get the matching rule with the highest
    //  * note that the rules aresorted by buyRatio (in descendant order)
    const buyRule = rules.find(threshold => {
      return threshold.marketPriceRatio.greaterThanOrEqualTo(priceRatio)
    })
    return buyRule ? buyRule.buyRatio : numberUtil.ZERO
  }

  async _sellTokenToCreateLiquidity ({ sellToken, buyToken, funding, auctionIndex, from }) {
    // decide if we sell on the auction A-B or the B-A
    //  * We sell on the auction with more liquidity
    const minimumSellVolume = await this._auctionRepo.getThresholdNewAuction()
    let amountToSellInUSD = minimumSellVolume.minus(funding)

    // We round up the dollars
    amountToSellInUSD = amountToSellInUSD
      // We add the maximun fee as an extra amount
      .div(numberUtil.ONE.minus(MAXIMUM_DX_FEE))

    // Round USD to 2 decimals
    amountToSellInUSD = numberUtil.roundUp(amountToSellInUSD)

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
      params: [amountInSellTokens.div(1e18), sellToken, amountToSellInUSD]
    })
    const sellOrder = await this._auctionRepo.postSellOrder({
      sellToken,
      buyToken,
      amount: amountInSellTokens,
      auctionIndex,
      from
    })
    auctionLogger.info({
      sellToken,
      buyToken,
      msg: 'Posted a sell order. Transaction: %s',
      params: [sellOrder.tx]
    })

    return {
      sellToken,
      buyToken,
      auctionIndex,
      amount: amountInSellTokens,
      amountInUSD: amountToSellInUSD
    }
  }

  _getAuctionLockName (operation, sellToken, buyToken, from) {
    const sufix = sellToken < buyToken ? sellToken + '-' + buyToken : buyToken + '-' + sellToken

    return operation + sufix + from
  }
}

function _getPriceRatio (price1, price2) {
  //  priceRatio = (P1n * P2d) / (P1d * P2n)
  return price1
    .numerator
    .mul(price2.denominator)
    .div(
      price1.denominator
        .mul(price2.numerator)
    )
}

module.exports = LiquidityService
