const loggerNamespace = 'dx-service:services:DxInfoService'
// const Logger = require('../../helpers/Logger')
// const logger = new Logger(loggerNamespace)
const AuctionLogger = require('../../helpers/AuctionLogger')
const auctionLogger = new AuctionLogger(loggerNamespace)
const ENVIRONMENT = process.env.NODE_ENV
const assert = require('assert')

// TODO: Implement real pagination
//  While there's not too many tokens, we defer the pagination implementation
const MOCK_PAGINATION = {
  endingBefore: null,
  startingAfter: null,
  limit: 0,
  order: [{
    param: 'symbol',
    direction: 'ASC'
  }],
  previousUri: null,
  nextUri: null
}

const numberUtil = require('../../helpers/numberUtil.js')

const getGitInfo = require('../../helpers/getGitInfo')
const getVersion = require('../../helpers/getVersion')
const getAuctionsBalances = require('../helpers/getAuctionsBalances')
const getClaimableTokens = require('../helpers/getClaimableTokens')

class DxInfoService {
  constructor ({
    auctionRepo,
    ethereumRepo,
    slackRepo,
    markets,
    operationsSlackChannel
  }) {
    assert(auctionRepo, '"auctionRepo" is required')
    assert(ethereumRepo, '"ethereumRepo" is required')
    assert(markets, '"markets" is required')

    this._auctionRepo = auctionRepo
    this._ethereumRepo = ethereumRepo
    this._slackRepo = slackRepo
    this._markets = markets
    this._operationsSlackChannel = operationsSlackChannel

    // About info
    this._gitInfo = getGitInfo()
    this._version = getVersion()
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

  async getClosingPrice ({ sellToken, buyToken, auctionIndex }) {
    let closingPrice = await this._auctionRepo.getClosingPrices({
      sellToken,
      buyToken,
      auctionIndex
    })
    return numberUtil.toBigNumberFraction(closingPrice, true)
  }

  async getLastAvaliableClosingPrice ({ sellToken, buyToken, auctionIndex }) {
    let closingPrice = await this._auctionRepo.getLastAvaliableClosingPrice({
      sellToken,
      buyToken,
      auctionIndex
    })
    return numberUtil.toBigNumberFraction(closingPrice, true)
  }

  async getClosingPrices ({ sellToken, buyToken, fromAuction, count }) {
    const lastAuctionIndex = await this._auctionRepo.getAuctionIndex({
      sellToken,
      buyToken
    })
    const toAuction = Math.min(lastAuctionIndex, fromAuction + count)

    const closingPricesPromises = []
    for (var i = fromAuction; i < toAuction; i++) {
      const auctionIndexAux = i
      const closingPricePromise = this._auctionRepo.getClosingPrices({
        sellToken,
        buyToken,
        auctionIndex: auctionIndexAux
      }).then(price => ({
        price,
        auctionIndex: auctionIndexAux
      }))

      closingPricesPromises.push(closingPricePromise)
    }

    // Get the closing prices
    const closingPrices = await Promise.all(closingPricesPromises)
    const priceIncrementPromises = closingPrices
      .map(async ({ price, auctionIndex }) => {
        let lastClosingPrice
        if (auctionIndex > 0) {
          lastClosingPrice = await this._auctionRepo.getLastAvaliableClosingPrice({
            sellToken,
            buyToken,
            auctionIndex: auctionIndex - 1
          })
        } else {
          lastClosingPrice = null
        }

        let priceDecimal = numberUtil
          .toBigNumberFraction(price, true)

        let lastClosingPriceDecimal = numberUtil
          .toBigNumberFraction(lastClosingPrice, true)

        let priceIncrement
        if (priceDecimal && lastClosingPriceDecimal !== null) {
          priceIncrement = numberUtil.getIncrement({
            newValue: priceDecimal,
            oldValue: lastClosingPriceDecimal
          })
        } else {
          priceIncrement = null
        }

        return {
          auctionIndex,
          price: priceDecimal,
          priceIncrement
        }
      })

    return Promise.all(priceIncrementPromises)
  }

  async getLastClosingPrices ({ sellToken, buyToken, count }) {
    // Get data
    const auctionIndex = await this._auctionRepo.getAuctionIndex({
      sellToken,
      buyToken
    })
    const fromAuction = (auctionIndex - count) > 0 ? auctionIndex - count + 1 : 0

    const closingPricesPromise = this.getClosingPrices({
      sellToken,
      buyToken,
      fromAuction,
      count
    })

    return closingPricesPromise
      .then(closingPrices => closingPrices.reverse())
  }

  // TODO: This method I think is not very useful for us...
  async getSellerBalancesOfCurrentAuctions ({ tokenPairs, address }) {
    return this._auctionRepo.getSellerBalancesOfCurrentAuctions({
      tokenPairs, address
    })
  }

  async getAuctionsBalances ({ tokenA, tokenB, address, count }) {
    return getAuctionsBalances({
      auctionRepo: this._auctionRepo,
      tokenA,
      tokenB,
      address,
      count
    })
  }

  async getClaimableTokens ({ tokenA, tokenB, address, lastNAuctions }) {
    return getClaimableTokens({
      auctionRepo: this._auctionRepo,
      tokenA,
      tokenB,
      address,
      lastNAuctions
    })
  }

  async isApprovedToken ({ token }) {
    return this._auctionRepo.isApprovedToken({ token })
  }

  async getMarketDetails ({ sellToken, buyToken }) {
    const tokenPair = { sellToken, buyToken }
    const [
      isSellTokenApproved,
      isBuyTokenApproved,
      stateInfo,
      state,
      isValidTokenPair,
      auctionIndex
    ] = await Promise.all([
      this._auctionRepo.isApprovedToken({ token: sellToken }),
      this._auctionRepo.isApprovedToken({ token: buyToken }),
      this._auctionRepo.getStateInfo(tokenPair),
      this._auctionRepo.getState(tokenPair),
      this._auctionRepo.isValidTokenPair({
        tokenA: sellToken,
        tokenB: buyToken
      }),
      this._auctionRepo.getAuctionIndex(tokenPair)
    ])

    const result = {
      isValidTokenPair,
      state,
      isSellTokenApproved,
      isBuyTokenApproved,
      auctionIndex: stateInfo.auctionIndex,
      auctionStart: stateInfo.auctionStart
    }

    if (isValidTokenPair) {
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

    const [ fundingInUSD, price, closingPriceSafe ] = await Promise.all([
      // Get the funding of the market
      this._auctionRepo.getFundingInUSD({
        tokenA, tokenB, auctionIndex
      }),
      // Get the actual price
      this._auctionRepo.getCurrentAuctionPrice({
        sellToken: tokenA,
        buyToken: tokenB,
        auctionIndex
      }),
      // Get the last "official" closing price
      this._auctionRepo.getPastAuctionPrice({
        sellToken: tokenA,
        buyToken: tokenB,
        auctionIndex: auctionIndex - 1
      })
    ])
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
        if (closingPriceSafe) {
          priceRelationshipPercentage = price.numerator
            .mul(closingPriceSafe.denominator)
            .div(price.denominator)
            .div(closingPriceSafe.numerator)
            .mul(100)
        }
      }

      if (!sellVolume.isZero()) {
        // Get the bought percentage:
        //    100 - 100 * (sellVolume - soldTokens) / sellVolume
        boughtPercentage = numberUtil.getPercentage({
          part: buyVolumesInSellTokens,
          total: sellVolume
        })
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
      closingPrice: closingPriceSafe, // official closing price (no 0)
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

    return {
      version: this._version,
      environment: ENVIRONMENT,
      auctions: auctionAbout,
      ethereum: ethereumAbout,
      git: this._gitInfo
    }
  }

  // TODO implement pagination
  async getMarkets ({ count } = {}) {
    const RAW_TOKEN_PAIRS = await this._auctionRepo.getTokenPairs()
    const tokenPairsPromises = RAW_TOKEN_PAIRS.map(async ({ sellToken: tokenA, buyToken: tokenB }) => {
      const [ tokenAInfo, tokenBInfo ] = await Promise.all([
        this._getTokenInfoByAddress(tokenA),
        this._getTokenInfoByAddress(tokenB)
      ])
      return {
        tokenA: tokenAInfo, tokenB: tokenBInfo
      }
    })

    return {
      data: await Promise.all(tokenPairsPromises),
      pagination: { ...MOCK_PAGINATION, count }
    }
  }

  // TODO implement pagination
  async getTokenList ({ count, approved = true } = {}) {
    const tokenPairs = await this._auctionRepo.getTokenPairs()
    const tokenAddresses = tokenPairs.reduce((addresses, {
      sellToken,
      buyToken
    }) => {
      if (!addresses.includes(sellToken)) {
        addresses.push(sellToken)
      }

      if (!addresses.includes(buyToken)) {
        addresses.push(buyToken)
      }

      return addresses
    }, [])

    const tokenPromises = tokenAddresses.map(async address => {
      return this._getTokenInfoByAddress(address)
    })

    return {
      data: await Promise.all(tokenPromises),
      pagination: { ...MOCK_PAGINATION, count }
    }
  }

  async getConfiguredTokenList ({ count, approved = true } = {}) {
    // TODO implement retrieving data from blockchain
    const tokenList = {
      data: [],
      pagination: {}
    }
    const fundedTokenList = await this._getConfiguredTokenList()

    tokenList.data = fundedTokenList
    tokenList.pagination = {
      endingBefore: null,
      startingAfter: null,
      limit: count,
      order: [{
        param: 'symbol',
        direction: 'ASC'
      }],
      previousUri: null,
      nextUri: null
    }
    return tokenList
  }

  async getMagnoliaToken () {
    const magnoliaToken = await this._auctionRepo.getMagnoliaToken()

    return this._getTokenInfoByAddress(magnoliaToken.address)
  }

  async getTokenAddress (token) {
    return this._auctionRepo.getTokenAddress({ token })
  }

  async _getTokenInfoByAddress (address) {
    return this._ethereumRepo.tokenGetInfo({ tokenAddress: address })
  }

  // TODO implement
  async getCurrencies () {}

  async getState ({ sellToken, buyToken }) {
    auctionLogger.debug({ sellToken, buyToken, msg: 'Get current state' })

    return this._auctionRepo.getState({ sellToken, buyToken })
  }

  async getCurrentPrice ({ sellToken, buyToken }) {
    auctionLogger.debug({ sellToken, buyToken, msg: 'Get current price' })

    const auctionIndex = await this._auctionRepo.getAuctionIndex({ sellToken, buyToken })
    let currentPrice = await this._auctionRepo.getCurrentAuctionPrice({ sellToken, buyToken, auctionIndex })

    return numberUtil.toBigNumberFraction(currentPrice, true)
  }

  async getAuctionStart ({ sellToken, buyToken }) {
    auctionLogger.debug({ sellToken, buyToken, msg: 'Get auction start' })

    return this._auctionRepo.getAuctionStart({ sellToken, buyToken })
  }

  async isValidTokenPair ({ sellToken, buyToken }) {
    return this._auctionRepo.isValidTokenPair({
      tokenA: sellToken,
      tokenB: buyToken
    })
  }

  async getSellVolume ({ sellToken, buyToken }) {
    return this._auctionRepo.getSellVolume({ sellToken, buyToken })
  }

  async getSellVolumeNext ({ sellToken, buyToken }) {
    return this._auctionRepo.getSellVolumeNext({ sellToken, buyToken })
  }

  async getBuyVolume ({ sellToken, buyToken }) {
    return this._auctionRepo.getBuyVolume({ sellToken, buyToken })
  }

  async getSellerBalanceForCurrentAuction ({ sellToken, buyToken, address }) {
    let auctionIndex = await this._auctionRepo.getAuctionIndex({ sellToken, buyToken })

    return this._auctionRepo.getSellerBalance({ sellToken, buyToken, auctionIndex, address })
  }

  async getSellerBalance ({ sellToken, buyToken, auctionIndex, address }) {
    return this._auctionRepo.getSellerBalance({
      sellToken,
      buyToken,
      auctionIndex,
      address
    })
  }

  async getBuyerBalanceForCurrentAuction ({ sellToken, buyToken, address }) {
    let auctionIndex = await this._auctionRepo.getAuctionIndex({ sellToken, buyToken })

    return this._auctionRepo.getBuyerBalance({ sellToken, buyToken, auctionIndex, address })
  }

  async getBuyerBalance ({ sellToken, buyToken, auctionIndex, address }) {
    return this._auctionRepo.getBuyerBalance({
      sellToken,
      buyToken,
      auctionIndex,
      address
    })
  }

  async getBalances ({ address }) {
    return this._auctionRepo.getBalances({ address })
  }

  async getBalanceOfEther ({ account }) {
    return this._ethereumRepo.balanceOf({ account })
  }

  async getAccountBalanceForTokenNotDeposited ({ token, account }) {
    const tokenAddress = await this.getTokenAddress(token)

    return this._ethereumRepo.tokenBalanceOf({ tokenAddress, account })
  }

  async getAccountBalancesForTokensNotDeposited ({ tokens, account }) {
    const balancesPromises = tokens.map(async token => {
      const amount = await this.getAccountBalanceForTokenNotDeposited({ token, account })

      return {
        token, amount
      }
    })

    return Promise.all(balancesPromises)
  }

  async getTokenTotalSupply ({ tokenAddress }) {
    return this._ethereumRepo.tokenTotalSupply({ tokenAddress })
  }

  async getTokenAllowance ({ tokenAddress, owner, spender }) {
    return this._ethereumRepo.tokenAllowance({ tokenAddress, owner, spender })
  }

  async getAccountBalanceForToken ({ token, address }) {
    return this._auctionRepo.getBalance({
      token,
      address
    })
  }

  async getPriceInUSD ({ token, amount }) {
    return this._auctionRepo.getPriceInUSD({
      token,
      amount
    })
  }

  async getFees ({
    fromDate,
    toDate,

    // optional params
    account
  }) {
    const [ fromBlock, toBlock ] = await Promise.all([
      this._ethereumRepo.getFirstBlockAfterDate(fromDate),
      this._ethereumRepo.getLastBlockBeforeDate(toDate)
    ])

    const fees = await this._auctionRepo.getFees({
      fromBlock: fromBlock,
      toBlock: toBlock,
      user: account
    })

    const feesDtoPromises = fees.map(async fee => {
      const {
        fee: feeInWei,
        user,
        tradeDate,
        sellToken: sellTokenAddress,
        buyToken: buyTokenAddress,
        auctionIndex,
        ethInfo
      } = fee

      const [ sellToken, buyToken ] = await Promise.all([
        this._getTokenInfoByAddress(sellTokenAddress),
        this._getTokenInfoByAddress(buyTokenAddress)
      ])

      return {
        sellToken,
        buyToken,
        auctionIndex: auctionIndex.toNumber(),
        fee: feeInWei.div(1e18).toNumber(),
        tradeDate,
        user,
        transactionHash: ethInfo.transactionHash
      }
    })

    return Promise.all(feesDtoPromises)
  }

  async getClaimings ({
    fromDate,
    toDate,

    // optional params
    account
  }) {
    const [ fromBlock, toBlock ] = await Promise.all([
      this._ethereumRepo.getFirstBlockAfterDate(fromDate),
      this._ethereumRepo.getLastBlockBeforeDate(toDate)
    ])

    const filterParams = {
      fromBlock: fromBlock,
      toBlock: toBlock,
      user: account
    }
    const buyerClamings = await this._auctionRepo.getClaimedFundsBuyer(filterParams)
    const sellerClamings = await this._auctionRepo.getClaimedFundsSeller(filterParams)

    const toClaimingDto = async claiming => {
      const {
        user,
        sellToken: sellTokenAddress,
        buyToken: buyTokenAddress,
        auctionIndex,
        amount: amountInWei,
        frtsIssued: frtsIssuedInWei,
        claimDate,
        ethInfo
      } = claiming

      const [ sellToken, buyToken ] = await Promise.all([
        this._getTokenInfoByAddress(sellTokenAddress),
        this._getTokenInfoByAddress(buyTokenAddress)
      ])

      return {
        sellToken,
        buyToken,
        auctionIndex: auctionIndex.toNumber(),
        claimDate,
        amount: amountInWei.div(1e18).toNumber(),
        user,
        frtsIssued: frtsIssuedInWei.div(1e18).toNumber(),
        transactionHash: ethInfo.transactionHash
      }
    }

    const buyerClaimingDtoPromises = buyerClamings.map(toClaimingDto)
    const sellerClaimingDtoPromises = sellerClamings.map(toClaimingDto)
    const [ buyer, seller ] = await Promise.all([
      Promise.all(buyerClaimingDtoPromises),
      Promise.all(sellerClaimingDtoPromises)
    ])

    return {
      buyer,
      seller
    }
  }

  async getTrades ({
    fromDate,
    toDate,

    // optional params
    type,
    account,
    token,
    sellToken,
    buyToken,
    auctionIndex
  }) {
    const [ fromBlock, toBlock ] = await Promise.all([
      this._ethereumRepo.getFirstBlockAfterDate(fromDate),
      this._ethereumRepo.getLastBlockBeforeDate(toDate)
    ])

    const getSellOrders = () => {
      return this._auctionRepo.getSellOrders({
        fromBlock,
        toBlock,
        user: account,
        sellToken,
        buyToken,
        auctionIndex
      })
    }
    const getBuyOrders = () => {
      return this._auctionRepo.getBuyOrders({
        fromBlock,
        toBlock,
        user: account,
        sellToken,
        buyToken,
        auctionIndex
      })
    }

    const etherPricePromise = this._auctionRepo.getPriceInUSD({
      token: 'WETH',
      amount: 1e18
    })

    // Decide if we get sellOrders, buyOrders, or both
    let sellOrders, buyOrders, etherPrice
    if (type) {
      switch (type) {
        case 'ask':
          // Get just sell orders
          sellOrders = await getSellOrders()
          buyOrders = []
          break

        case 'bid':
        // Get just buy orders
          sellOrders = []
          buyOrders = await getBuyOrders()
          break
        default:
          throw new Error('Unknown trade type: ' + type)
      }
      etherPrice = await etherPricePromise
    } else {
      // Get both: sell and buy orders
      const [ sellOrdersAux, buyOrdersAux, etherPriceAux ] = await Promise.all([
        // Get sell orders
        getSellOrders(),

        // Get buy orders
        getBuyOrders(),

        // Get WETH price
        etherPricePromise
      ])
      sellOrders = sellOrdersAux
      buyOrders = buyOrdersAux
      etherPrice = etherPriceAux
    }

    const orders = sellOrders.concat(buyOrders)
    let ordersDto = await this._toOrderDto(orders, etherPrice)

    if (token) {
      // Filter out the auction that don't have the token
      // TODO: This filter is done programatically for simplicity, but we can
      // check if there is a performance gain when is done as a repo filter,
      // especially if the number of token pairs grows a lot
      ordersDto = ordersDto.filter(order => {
        return order.sellToken.symbol === token ||
          order.buyToken.symbol === token
      })
    }

    return ordersDto
  }

  async _getConfiguredTokenList () {
    let tokenList = this._markets.reduce((list, { tokenA, tokenB }) => {
      if (list.indexOf(tokenA) === -1) {
        list.push(tokenA)
      }

      if (list.indexOf(tokenB) === -1) {
        list.push(tokenB)
      }
      return list
    }, [])

    let addressesList = await Promise.all(
      tokenList.map(token => {
        return this._auctionRepo.getTokenAddress({ token })
      }))

    let detailedTokenList = await Promise.all(addressesList.map(address => {
      return this._getTokenInfoByAddress(address)
    }))

    return detailedTokenList
    // return this._auctionRepo.getTokens()
  }

  async _toOrderDto (orders, etherPrice) {
    const orderDtoPromises = orders.map(async order => {
      const {
        sellToken,
        buyToken,
        auctionIndex,
        user,
        amount,
        dateTime,
        ethInfo
      } = order

      const [
        sellTokenInfo,
        buyTokenInfo,
        transactionReceipt,
        transaction
      ] = await Promise.all([
        // Get sell token info
        this._ethereumRepo.tokenGetInfo({
          tokenAddress: sellToken
        }),

        // Get buy token info
        this._ethereumRepo.tokenGetInfo({
          tokenAddress: buyToken
        }),

        // Get transaction receip
        this._ethereumRepo.getTransactionReceipt(ethInfo.transactionHash),

        // Get transaction
        this._ethereumRepo.getTransaction(ethInfo.transactionHash)
      ])

      let type
      switch (ethInfo.event) {
        case 'NewSellOrder':
          type = 'ask'
          break

        case 'NewBuyOrder':
          type = 'bid'
          break

        default:
          break
      }

      const gasUsed = transactionReceipt.gasUsed
      const gasPrice = transaction.gasPrice
      const gasPriceGwei = gasPrice.mul(1e-9)
      const gasCost = gasPrice.mul(gasUsed).div(1e18)
      const gasCostInUsd = numberUtil.round(gasCost.mul(etherPrice))

      return {
        auctionIndex,
        sellToken: sellTokenInfo,
        buyToken: buyTokenInfo,
        user,
        amount,
        dateTime,
        type,
        transactionHash: ethInfo.transactionHash,
        blockHash: ethInfo.blockHash,
        blockNumber: ethInfo.blockNumber,
        gasLimit: transaction.gas,
        gasUsed,
        gasPriceGwei,
        gasCost,
        gasCostInUsd,
        nonce: transaction.nonce
      }
    })

    return Promise.all(orderDtoPromises)
  }

  async getCurrentFeeRatio ({ address }) {
    let feeRatio = await this._auctionRepo.getFeeRatio({ address })

    return feeRatio[0].div(feeRatio[1])
  }

  async getExtraTokens ({ sellToken, buyToken, auctionIndex }) {
    return this._auctionRepo.getExtraTokens({ sellToken, buyToken, auctionIndex })
  }

  async notifySlack (message, logger) {
  //   const message = `Starting Bots and Bots API Server v${version} in \
  // "${environment}" environment`

    // Display some basic info
    logger.info(message)

    if (this._slackRepo.isEnabled()) {
      await this._slackRepo.postMessage({
        channel: this._operationsSlackChannel,
        text: message
      }).catch(error => {
        logger.error({
          msg: 'Error notifying operation to Slack: ' + error.toString(),
          error
        })
      })
    }
  }
}

module.exports = DxInfoService
