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
      minimumSellVolumeDefault: await this._auctionRepo.getThresholdNewAuction()
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

  async ensureSellLiquidity ({
    sellToken,
    buyToken,
    from,
    minimumSellVolumeInUsd,
    waitToReleaseTheLock = true
  }) {
    return this._ensureLiquidityAux({
      sellToken,
      buyToken,
      from,
      minimumSellVolumeInUsd,
      liquidityCheckName: 'sell',
      waitToReleaseTheLock
    })
  }

  async _ensureLiquidityAux ({
    sellToken,
    buyToken,
    from,
    minimumSellVolumeInUsd,
    buyLiquidityRules,
    liquidityCheckName,
    waitToReleaseTheLock
  }) {
    // Define some variables to refacor sell/buy liquidity checks
    let boughtOrSoldTokensPromise, doEnsureLiquidityFnName, baseLockName,
      messageCurrentCheck, paramsCurrentCheck, minimumSellVolume
    if (liquidityCheckName === 'sell') {
      minimumSellVolume = minimumSellVolumeInUsd ? numberUtil.toBigNumber(minimumSellVolumeInUsd) : await this._auctionRepo.getThresholdNewAuction()

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
      // Clear concurrency lock and resolve promise
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
        minimumSellVolume,
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

  async _doEnsureSellLiquidity ({
    tokenA,
    tokenB,
    from,
    minimumSellVolume
  }) {
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
      const { fundingA, fundingB } = await this._auctionRepo.getFundingInUSD({
        tokenA, tokenB, auctionIndex
      })

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
            from,
            minimumSellVolume
          })
          soldTokens.push(soldTokenAB)
        }
        if (fundingB.lessThan(minimumSellVolume)) {
          soldTokenBA = await this._sellTokenToCreateLiquidity({
            sellToken: tokenB,
            buyToken: tokenA,
            funding: fundingB,
            auctionIndex,
            from,
            minimumSellVolume
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
      from
      // buyLiquidityRules
    })

    // tokenB-tokenA: Get soldTokens
    const soldTokensB = await this._getPricesAndAttemptArbitrage({
      sellToken: tokenB,
      buyToken: tokenA,
      auctionIndex,
      from
      // buyLiquidityRules
    })

    if (soldTokensA) {
      results.push(soldTokensA)
    }
    if (soldTokensB) {
      results.push(soldTokensB)
    }

    // if there are some results, there may be more. try to run again with the new ether just gained
    // keep doing this until there is no more arbitrage (no results) then return all results
    if (results.length > 0) {
      let more = await this._doEnsureArbitrageLiquidity({ tokenA, tokenB, from, buyLiquidityRules })
      if (more.length) results.push(...more)
    }

    return results
  }

  async _getPricesAndAttemptArbitrage ({ buyToken, sellToken, auctionIndex, from, buyLiquidityRules }) {
    const {
      sellVolume,
      isClosed,
      isTheoreticalClosed
    } = await this._auctionRepo.getAuctionState({
      sellToken,
      buyToken,
      auctionIndex
    })

    // // We need to check arbitrage opportunity if:
    // //  * The auction has sell volume
    // //  * Is not closed yet
    // //  * Is not in theoretical closed state
    if (!sellVolume.isZero()) {
      if (!isClosed && !isTheoreticalClosed) {
        // find which of our tokens is the ether Token
        const { etherToken, etherTokenAddress } = this._arbitrageRepo.whichTokenIsEth(buyToken, sellToken)

        // get the current price for our token pair on the dutchX
        // it is buyToken per sellToken, so it tells us that
        // price = buyerToken / sellerToken
        // result = buytoken / price
        const {
          numerator, // buyVolumes[sellToken][buyToken]
          denominator // sellVolumesCurrent[sellToken][buyToken]
        } = await this._auctionRepo.getCurrentAuctionPrice({
          sellToken,
          buyToken,
          auctionIndex,
          from
        })
        let dutchPrice = numerator.div(denominator)

        const dutchAttempt = buyToken === etherToken

        // now we get the current state of the uniswap exchange for our token pair
        const {
          inputBalance, // our current sellToken on dutchX
          outputBalance // our current buyToken on dutchX
        } = await this._arbitrageRepo.getUniswapBalances({ buyToken, sellToken })

        let uniswapPrice = outputBalance.div(inputBalance) // buyToken per sellToken

        auctionLogger.info({
          sellToken,
          buyToken,
          msg: 'Prices: \n%O',
          params: [{
            dutchAttempt,
            theoreticalUniswapPrice: uniswapPrice.toString(10) + ' buyToken per sellToken',
            theoreticalDutchPrice: dutchPrice.toString(10) + ' buyToken per sellToken'
          }]
        })

        // next we check our arbitrage contract's ether balance
        // to see what the maximum amount we can spend is
        const arbitrageAddress = this._arbitrageRepo.getArbitrageAddress()
        let maxEtherToSpend = await this._auctionRepo.getBalance({
          token: etherTokenAddress,
          address: arbitrageAddress
        })

        if (maxEtherToSpend.eq(0)) {
          auctionLogger.warn({
            sellToken,
            buyToken,
            msg: `Ether Balance (${etherTokenAddress}) is zero on account ${arbitrageAddress} (arbitrage contract) using _dx contract ${this._auctionRepo._dx.address} pls depositEther`
          })
          return null
        }

        // return now if there is no arbitrage opportunity when prices are only theoretical (better than actual prices)
        if (dutchPrice.gt(uniswapPrice)) {
          auctionLogger.warn({
            sellToken,
            buyToken,
            msg: 'No arbitrage opportunity'
          })
          return null
        }

        // gasCosts is the amount of profit needed from the arbitrage to pay for gas costs
        const uniswapGasEstimate = 559830
        const dutchGasEstimate = 565134
        const { fastGasPrice } = await this._arbitrageRepo._getGasPrices()
        let gasCosts = dutchAttempt ? dutchGasEstimate : uniswapGasEstimate
        gasCosts = numberUtil.toBigNumber(gasCosts).mul(fastGasPrice)

        let owlAllowance = await this._auctionRepo._tokens.OWL.allowance(from, this._auctionRepo._dx.address)
        let owlBalance = await this._auctionRepo._tokens.OWL.balanceOf(from)
        const ethUSDPrice = await this._auctionRepo.getPriceEthUsd()

        // dutchOpportunity
        if (dutchAttempt) {
          // if (buyToken === etherToken) {
          auctionLogger.info({
            sellToken,
            buyToken,
            msg: 'Attempt Duch Opportunity: \n%O',
            params: [{
              maxEtherToSpend: numberUtil.fromWei(maxEtherToSpend).toString(10) + ' ETH'
            }]
          })

          // on a dutchOpportunity the maxToSpend remains as Ether
          // amount is the maximum amount of Ether we should spend on this opportunity to make a profit
          let amount = await this.getSpendAmount({
            dutchPrice,
            maxToSpend: maxEtherToSpend,
            inputBalance, // sellToken balance
            outputBalance, // buyToken balance
            from,
            sellToken,
            buyToken,
            auctionIndex,
            owlAllowance,
            owlBalance,
            ethUSDPrice
          })

          let amountAfterFee = await this._auctionRepo.getCurrentAuctionPriceWithFees({ sellToken, buyToken, auctionIndex, amount, from, owlAllowance, owlBalance, ethUSDPrice })
          var tokensExpectedFromDutch = amountAfterFee.div(dutchPrice)

          // how much Ether would be returned after selling the sellToken on uniswap
          let uniswapExpected = await this._arbitrageRepo.getTokenToEthInputPrice(sellToken, tokensExpectedFromDutch.toString(10))
          const expectedProfit = uniswapExpected.sub(amount).sub(gasCosts)

          // if the amount to spend is 0 there is no opportunity
          // otherwise execute the opportunity
          if (amount.gt(0) && expectedProfit.gt(0)) {
            const expectedProfit = uniswapExpected.sub(amount)
            uniswapPrice = uniswapExpected.div(amount)
            dutchPrice = numberUtil.toBigNumber(1).div(amount.mul(dutchPrice).div(amountAfterFee))
            auctionLogger.info({
              sellToken,
              buyToken,
              msg: 'Making a dutchX opportunity transaction: \n%O',
              params: [{
                balanceBefore: numberUtil.fromWei(maxEtherToSpend).toString(10) + ' Eth',
                amount: numberUtil.fromWei(amount).toString(10) + ' Eth',
                uniswapExpected: numberUtil.fromWei(uniswapExpected).toString(10) + ' Eth',
                tokensExpectedFromDutch: tokensExpectedFromDutch.toString(10) + ' Tokens',
                expectedProfit: numberUtil.fromWei(expectedProfit).toString(10) + ' Eth',
                uniswapPrice: uniswapPrice.toString(10) + ' WEI / token',
                dutchPrice: dutchPrice.toString(10) + ' WEI / token'
              }]
            })

            let tx = await this._arbitrageRepo.dutchOpportunity({
              arbToken: sellToken,
              amount,
              from
            })

            let balanceAfter = await this._auctionRepo.getBalance({
              token: etherTokenAddress,
              address: arbitrageAddress
            })
            const actualProfit = balanceAfter.sub(maxEtherToSpend)
            auctionLogger.info({
              sellToken,
              buyToken,
              msg: 'Completed a dutchX opportunity: \n%O',
              params: [{
                balanceBefore: numberUtil.fromWei(maxEtherToSpend).toString(10) + ' Eth',
                balanceAfter: numberUtil.fromWei(balanceAfter).toString(10) + ' Eth',
                actualProfitEth: numberUtil.fromWei(actualProfit).toString(10) + ' Eth',
                actualProfit: actualProfit.toString(10) + ' Wei'
              }]
            })
            return {
              type: 'DutchOpportunity',
              arbToken: sellToken,
              amount,
              expectedProfit,
              actualProfit,
              dutchPrice,
              uniswapPrice,
              tx
            }
          }

        // We are the buyer. If the seller token is ether that means the buyer token is some real token. We use the
        // buyer token to get etherToken from the dutchX. If we want ether from DutchX, it means
        // we would have bought some token cheaply from uniswap. This would have been an opportunity on uniswap.
        // a uniswapOpportunity...
        // vvvvvvvvvv
        } else if (sellToken === etherToken) {
          auctionLogger.info({
            sellToken,
            buyToken,
            msg: 'Attempt Uniswap Opportunity: \n%O',
            params: [{
              maxEtherToSpend: numberUtil.fromWei(maxEtherToSpend).toString(10) + ' ETH'
            }]
          })

          // maxToSpend is referring to the maximum amount of buyTokens on dutchX.
          // when the buyToken is an actual token instead of Ether, it means that
          // maxToSpend will be the result of spending all available Ether on uniswap.
          let maxToSpend = this.getInputPrice(maxEtherToSpend, inputBalance, outputBalance)

          // tokenAmount is the maximum amount of buyToken we should spend on the dutchX on this opportunity to make a profit
          let tokenAmount = await this.getSpendAmount({
            dutchPrice,
            maxToSpend,
            inputBalance, // sellToken balance
            outputBalance, // buyToken balance
            from,
            sellToken,
            buyToken,
            auctionIndex,
            owlAllowance,
            owlBalance,
            ethUSDPrice
          })
          // now we have the amount to use as buyToken on dutchX, but we actually need the amount
          // of ether to spend on uniswap. To get this we need to find out how much the tokens
          // cost in ether on uniswap.
          let amount = this.getOutputPrice(tokenAmount, inputBalance, outputBalance)

          // how much Ether would be returned after selling the token on dutchX
          let amountAfterFee = await this._auctionRepo.getCurrentAuctionPriceWithFees({ sellToken, buyToken, auctionIndex, amount: tokenAmount, from, owlAllowance, owlBalance, ethUSDPrice })
          let dutchXExpected = amountAfterFee.div(dutchPrice)
          const expectedProfit = dutchXExpected.sub(amount).sub(gasCosts)

          auctionLogger.info({
            sellToken,
            buyToken,
            msg: 'Check uniswap opportunity: \n%O',
            params: [
              {
                tokenAmount: tokenAmount.toString(10) + ' token',
                amount: numberUtil.fromWei(amount).toString(10) + ' Eth',
                dutchExpected: numberUtil.fromWei(dutchXExpected).toString(10) + ' Eth',
                gasCosts: numberUtil.fromWei(gasCosts).toString(10) + ' Eth',
                expectedProfit: numberUtil.fromWei(expectedProfit).toString(10) + ' Eth'
              }
            ]
          })
          // if the amount to spend is 0 there is no opportunity
          // otherwise execute the opportunity
          if (amount.gt(0) && expectedProfit.gt(0)) {
            dutchPrice = amount.mul(dutchPrice).div(amountAfterFee)
            uniswapPrice = tokenAmount.div(amount)
            auctionLogger.info({
              sellToken,
              buyToken,
              msg: 'Making a uniswap opportunity transaction: \n%O',
              params: [{
                balanceBefore: numberUtil.fromWei(maxEtherToSpend).toString(10) + ' Eth',
                dutchPrice: dutchPrice + ' WEI / token',
                uniswapPrice: uniswapPrice + ' WEI / token'
              }]
            })

            let tx = await this._arbitrageRepo.uniswapOpportunity({
              arbToken: buyToken,
              amount,
              from
            })

            let balanceAfter = await this._auctionRepo.getBalance({
              token: etherTokenAddress,
              address: arbitrageAddress
            })
            const actualProfit = balanceAfter.sub(maxEtherToSpend)
            auctionLogger.info({
              sellToken,
              buyToken,
              msg: 'Completed a uniswap opportunity: \n%O',
              params: [{
                balanceBefore: numberUtil.fromWei(maxEtherToSpend).toString(10) + ' Eth',
                balanceAfter: numberUtil.fromWei(balanceAfter).toString(10) + ' Eth',
                actualProfitEth: numberUtil.fromWei(actualProfit).toString(10) + ' Eth',
                actualProfitWei: actualProfit.toString(10) + ' Wei'
              }]
            })
            return {
              type: 'UniswapOpportunity',
              arbToken: buyToken,
              amount,
              expectedProfit,
              actualProfit,
              dutchPrice,
              uniswapPrice,
              tx
            }
          }
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
          msg: 'The auction is already closed: \n%O',
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

  // def getOutputPrice(output_amount: uint256, input_reserve: uint256, output_reserve: uint256) -> uint256:
  // assert input_reserve > 0 and output_reserve > 0
  // numerator: uint256 = input_reserve * output_amount * 1000
  // denominator: uint256 = (output_reserve - output_amount) * 997
  // return numerator / denominator + 1
  getOutputPrice (output_amount, input_reserve, output_reserve) {
    assert(input_reserve.gt(0), 'Input reserve must be greater than 0')
    assert(output_reserve.gt(0), 'Input reserve must be greater than 0')
    const numerator = input_reserve.mul(output_amount).mul(1000)
    const denominator = output_reserve.sub(output_amount).mul(997)
    return numerator.div(denominator).add(1)
  }

  // def getInputPrice(input_amount: uint256, input_reserve: uint256, output_reserve: uint256) -> uint256:
  //   assert input_reserve > 0 and output_reserve > 0
  //   input_amount_with_fee: uint256 = input_amount * 997
  //   numerator: uint256 = input_amount_with_fee * output_reserve
  //   denominator: uint256 = (input_reserve * 1000) + input_amount_with_fee
  //   return numerator / denominator
  getInputPrice (input_amount, input_reserve, output_reserve) {
    assert(input_reserve.gt(0), 'Input reserve must be greater than 0')
    assert(output_reserve.gt(0), 'Input reserve must be greater than 0')
    const input_amount_with_fee = input_amount.mul(997)
    const numerator = input_amount_with_fee.mul(output_reserve)
    const denominator = input_reserve.mul(1000).add(input_amount_with_fee)
    return numerator.div(denominator)
  }

  async getSpendAmount ({
    maxToSpend,
    inputBalance, // sellToken balance
    outputBalance, // buyToken balance
    dutchPrice,
    from,
    sellToken,
    buyToken,
    auctionIndex,
    owlAllowance,
    owlBalance,
    ethUSDPrice
  }) {
    // these must be positive amounts.
    // it is also worth considering making the small increment rather large
    // because if it is too precise, the profit margin may disappear between the time it is
    // calculated and actually executed. The dutch X price would improve, but the increased
    // purchase amount might actually create too much slippage on uniswap, possibly destroying the profit
    // const spendIncrementSmall = 1e3
    // const spendIncrementLarge = 1e17

    let spendIncrement = numberUtil.toBigNumber(1e18)
    const spendIncrementMin = numberUtil.toBigNumber(1e3)

    let inputAmount = numberUtil.toBigNumber(spendIncrement)

    let opportunity = true
    // let useLargeIncrement = true
    let finalPrice = false

    // let increasing = true

    // want to loop through smaller and smaller spending increments
    // stop when maxToSpend is hit or when the increment price is too small
    while (!finalPrice) {
      if (inputAmount.gt(maxToSpend) || !opportunity) {
        if (inputAmount.lte(maxToSpend) && spendIncrement.gt(spendIncrementMin)) {
          inputAmount = inputAmount.sub(spendIncrement)
          spendIncrement = spendIncrement.div(10)
          opportunity = true
          continue
        } else {
          inputAmount = inputAmount.sub(spendIncrement)
          finalPrice = true
          opportunity = true
          continue
        }
      }

      // when you spend some amount, part is removed as fees. Your buy is recorded as only the reduced amount.
      let amountAfterFee = await this._auctionRepo.getCurrentAuctionPriceWithFees({ sellToken, buyToken, auctionIndex, amount: inputAmount, from, owlAllowance, owlBalance, ethUSDPrice })

      // if you were to claim your buy right away it would be that amountAfterFee times the current price
      let realDutchPrice = inputAmount.mul(dutchPrice).div(amountAfterFee)
      // inputAmount is a buyerToken. buyertoken is traded for seller token
      // sellerToken is input token, output_token is buyerToken
      // output amount is sellerToken, output amount is input_token
      let outputAmount = inputAmount.div(realDutchPrice)
      // inputAmount on uniswap is amount returned from the dutchX
      // how much does it cost to acquire this much?
      // output_returned is buyerToken
      let outputReturned = this.getInputPrice(outputAmount, inputBalance, outputBalance)
      let uniswapPrice = outputReturned.div(outputAmount)
      if (realDutchPrice.gt(uniswapPrice)) {
        opportunity = false
      } else {
        inputAmount = inputAmount.add(spendIncrement)
      }
      // console.log('end input_amount', inputAmount.toString(10))
    }
    return inputAmount
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
      hasAuctionStarted,
      isClosed,
      isTheoreticalClosed
    } = auctionState

    auctionLogger.debug({
      sellToken,
      buyToken,
      msg: 'State of the auction: %o',
      params: [{ sellVolume: sellVolume.toNumber(), hasAuctionStarted, isClosed, isTheoreticalClosed }]
    })

    // We do need to ensure the liquidity if:
    //  * The auction has sell volume
    //  * The auction has started
    //  * Is not closed yet
    //  * Is not in theoretical closed state
    if (!sellVolume.isZero() && hasAuctionStarted) {
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
      if (!hasAuctionStarted) {
        // Auction hasn't started
        auctionLogger.info({
          sellToken,
          buyToken,
          msg: 'The auction hasn\'t started yet. Will check back later'
        })
      } else {
        // No sell volume
        auctionLogger.debug({
          sellToken,
          buyToken,
          msg: "The auction doesn't have any sell volume, so there's nothing to buy"
        })
      }
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

  async _sellTokenToCreateLiquidity ({
    sellToken,
    buyToken,
    funding,
    auctionIndex,
    from,
    minimumSellVolume
  }) {
    // decide if we sell on the auction A-B or the B-A
    //  * We sell on the auction with more liquidity
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
