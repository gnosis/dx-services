const loggerNamespace = 'dx-service:repositories:AuctionRepoImpl'
const Logger = require('../../helpers/Logger')
const logger = new Logger(loggerNamespace)
const AuctionLogger = require('../../helpers/AuctionLogger')
const auctionLogger = new AuctionLogger(loggerNamespace)

const assert = require('assert')

const AUCTION_START_FOR_WAITING_FOR_FUNDING = 1
const MAXIMUM_FUNDING = 10 ** 30

// TODO load thresfolds from contract
const THRESHOLD_NEW_TOKEN_PAIR = 10000
const BigNumber = require('bignumber.js')
const { toBigNumber } = require('../../helpers/numerUtil.js')

const environment = process.env.NODE_ENV
const isLocal = environment === 'local'

class AuctionRepoImpl {
  constructor ({
    ethereumClient,
    defaultGas,
    gasPriceGWei,
    contracts
  }) {
    this._ethereumClient = ethereumClient
    this._defaultGas = defaultGas
    this._gasPrice = gasPriceGWei * 10 ** 9
    
    // Contracts
    this._dx = contracts.dx
    this._priceOracle = contracts.priceOracle
    this._tokens = Object.assign({
      GNO: contracts.gno,
      ETH: contracts.eth,
      TUL: contracts.tul,
      OWL: contracts.owl
    }, contracts.erc20TokenContracts)
    logger.debug(`DX contract in address %s`, this._dx.address)
    logger.debug(`Price Oracle in address %s`, this._priceOracle.address)

    this.ready = Promise.resolve()
    Object.keys(this._tokens).forEach(token => {
      const contract = this._tokens[token]
      logger.debug(`Token %s in address %s`,
        token,
        contract.address
      )
    })
  }

  async getBasicInfo () {
    // logger.debug('Get auction basic info')
    const auctioneerAddress = await this._dx.auctioneer.call()
    const tokenNames = Object.keys(this._tokens)
    const blockNumber = await this._ethereumClient.getBlockNumber()

    return {
      network: this._ethereumClient.getUrl(),
      blockNumber,
      auctioneer: auctioneerAddress,
      dxAddress: this._dx.address,
      priceOracleAddress: this._priceOracle.address,
      tokens: tokenNames.map(name => ({
        name,
        address: this._tokens[name].address
      }))
    }
  }

  async getStateInfo ({ sellToken, buyToken }) {
    assertPair(sellToken, buyToken)

    // auctionLogger.debug(sellToken, buyToken, 'Get state')
    const auctionIndex = await this.getAuctionIndex({ sellToken, buyToken })
    // auctionLogger.debug(sellToken, buyToken, 'Auction index: %d', auctionIndex)

    let auctionStart, auction, auctionOpp
    if (auctionIndex === 0) {
      // The token pair doesn't exist
      auctionStart = null
      auction = null
      auctionOpp = null
    } else {
      auctionStart = await this.getAuctionStart({ sellToken, buyToken })

      // Check the state on each side of the auction
      let [ auctionState, auctionOppState ] = await Promise.all([
        this._getAuctionState({ sellToken, buyToken, auctionIndex }),
        this._getAuctionState({ sellToken: buyToken, buyToken: sellToken, auctionIndex })
      ])
      auction = auctionState
      auctionOpp = auctionOppState
    }

    return {
      auctionIndex,
      auctionStart,

      // auction: { buyVolume, sellVolume, closingPrice, isClosed, isTheoreticalClosed }
      auction,
      // auctionOpp: { buyVolume, sellVolume, closingPrice, isClosed, isTheoreticalClosed }
      auctionOpp
    }
  }

  async getState ({ sellToken, buyToken }) {
    assertPair(sellToken, buyToken)

    const {
      auctionIndex,
      auctionStart,
      auction,
      auctionOpp
    } = await this.getStateInfo({ sellToken, buyToken })

    if (auctionIndex === 0) {
      return 'UNKNOWN_TOKEN_PAIR'
    } else {
      const {
        isClosed,
        isTheoreticalClosed
        // sellVolume
      } = auction

      const {
        isClosed: isClosedOpp,
        isTheoreticalClosed: isTheoreticalClosedOpp
        // sellVolume: sellVolumeOpp
      } = auctionOpp

      const now = await this._getTime()
      if (auctionStart === null) {
        // We havent surplus the threshold (or it's the first auction)
        return 'WAITING_FOR_FUNDING'
      } else if (auctionStart >= now) {
        return 'WAITING_FOR_AUCTION_TO_START'
      } else if (
        (isTheoreticalClosed && !isClosed) ||
        (isTheoreticalClosedOpp && !isClosedOpp)) {
        return 'PENDING_CLOSE_THEORETICAL'
      } else if (
        (isClosed && !isClosedOpp) ||
        (!isClosed && isClosedOpp)) {
        return 'ONE_AUCTION_HAS_CLOSED'
      } else {
        return 'RUNNING'
      }
    }
  }

  // TODO: Review this logic. This are the states of the diagram
  // (not used right now)
  async getState2 ({ sellToken, buyToken }) {
    assertPair(sellToken, buyToken)

    const {
      auctionStart,
      auction,
      auctionOpp
    } = await this.getStateInfo({ sellToken, buyToken })
    const {
      isClosed,
      isTheoreticalClosed,
      sellVolume
    } = auction

    const {
      isClosed: isClosedOpp,
      isTheoreticalClosed: isTheoreticalClosedOpp,
      sellVolume: sellVolumeOpp
    } = auctionOpp

    if (auctionStart === null) {
      // We havent surplus the threshold
      return 'WAITING_FOR_FUNDING' // S0
    } else if (sellVolume === 0 || sellVolumeOpp === 0) {
      // One of the auctions doesn't have sell volume

      if (
        (sellVolume === 0 && isTheoreticalClosedOpp) ||
        (sellVolumeOpp === 0 && isTheoreticalClosed)) {
        // One has no SellVolume
        // The other is theoretically closed
        return 'ONE_THEORETICAL_CLOSED' // S7
      } else {
        // One of the auctions is running
        // the other one has no sell volume
        return 'RUNNING_ONE_NOT_SELL_VOLUME' // S1
      }
    } else {
      // They both have volume

      if (
        isTheoreticalClosed && isTheoreticalClosedOpp &&
        !isClosed && !isClosedOpp) {
        // both are close theoretical
        // and not closed yet
        return 'BOTH_THEORETICAL_CLOSED' // S4
      } else if (isClosedOpp || isClosed) {
        // At least, one of the auctions is closed for real

        if (
          (isClosed && !isTheoreticalClosedOpp) ||
          (isClosedOpp && !isTheoreticalClosed)
        ) {
          // One auction is closed
          // The other one is still running
          return 'ONE_CLEARED_AUCTION' // S2
        } else if (
          (isClosed && isTheoreticalClosedOpp) ||
          (isClosedOpp && isTheoreticalClosed)) {
          // One is closed for real
          // The other is closed theoretical
          return 'ONE_CLEARED_AUCTION_ONE_THEORETICAL_CLOSE' // S6
        }
      }

      if (isTheoreticalClosedOpp || isTheoreticalClosed) {
        // One theoretical close
        // S3
        return 'ONE_THEORETICAL_CLOSED'
      }

      // The only state left
      return 'RUNNING' // S0
    }
  }

  async getAuctionIndex ({ sellToken, buyToken }) {
    assertPair(sellToken, buyToken)

    return this
      ._callForPair({
        operation: 'getAuctionIndex',
        sellToken,
        buyToken,
        checkTokens: false
      })
      .then(parseInt)
  }

  async getAuctionStart ({ sellToken, buyToken }) {
    assertPair(sellToken, buyToken)

    const auctionStartEpoch = await this._callForPair({
      operation: 'getAuctionStart',
      sellToken,
      buyToken,
      checkTokens: false
    })

    // The SC has 0 when the contract is initialized
    // 1 when looking for founding. For the repo, they both will be modeled as a
    // null state of the auctionStart
    if (auctionStartEpoch <= AUCTION_START_FOR_WAITING_FOR_FUNDING) {
      return null
    } else {
      return epochToDate(auctionStartEpoch)
    }
  }

  async approveToken ({ token, from, isApproved = true }) {
    assert(token, 'The token is required')
    assert(from, 'The from is required')

    return this._transactionForToken({
      operation: 'updateApprovalOfToken',
      from,
      token: token,
      args: [ isApproved ? 1 : 0 ],
      checkToken: false
    })
  }

  async isApprovedToken ({ token }) {
    assert(token, 'The token is required')

    return this._callForToken({
      operation: 'approvedTokens',
      token: token,
      checkToken: false
    })
  }

  async isApprovedMarket ({ tokenA, tokenB }) {
    assertPair(tokenA, tokenB)

    const auctionIndex = await this.getAuctionIndex({
      sellToken: tokenA,
      buyToken: tokenB
    })
    // auctionLogger.debug(tokenA, tokenB,'isApprovedMarket? auctionIndex=%s', auctionIndex)

    return auctionIndex > 0
  }

  async hasPrice ({ token }) {
    assert(token, 'The token is required')

    return this.isApprovedMarket({
      tokenA: token,
      tokenB: 'ETH'
    })
  }

  // TODO: getCurrencies?

  async getSellVolume ({ sellToken, buyToken }) {
    assertPair(sellToken, buyToken)

    return this._callForPair({
      operation: 'sellVolumesCurrent',
      sellToken,
      buyToken,
      checkTokens: false
    })
  }

  async getSellVolumeNext ({ sellToken, buyToken }) {
    assertPair(sellToken, buyToken)

    return this._callForPair({
      operation: 'sellVolumesNext',
      sellToken,
      buyToken,
      checkTokens: false
    })
  }

  async getBuyVolume ({ sellToken, buyToken }) {
    assertPair(sellToken, buyToken)

    return this._callForPair({
      operation: 'buyVolumes',
      sellToken,
      buyToken,
      checkTokens: false
    })
  }

  async getBalance ({ token, address }) {
    assert(token, 'The token is required')
    assert(address, 'The address is required')

    return this._callForToken({
      operation: 'balances',
      token,
      args: [ address ],
      checkToken: false
    })
  }

  async getTokens () {
    return Object.keys(this._tokens)
  }

  async getTokenAddress ({ token }) {
    return this._getTokenAddress(token, false)
  }

  async getBalanceERC20Token ({ token, address }) {
    assert(token, 'The token is required')
    assert(address, 'The address is required')

    const tokenContract = this._getTokenContract(token)
    // console.log('Amount: ', amount, token)
    return tokenContract.address
    // return tokenContract.balanceOf.call(address)
    /*
    return this._callForToken({
      operation: 'balanceOf',
      token,
      args: [ address ],
      checkToken: false
    })
    */
  }

  async getBalances ({ address }) {
    assert(address, 'The address is required')

    // auctionLogger.debug('Get balances for %s', address)
    const balancePromises =
      // for every token
      Object.keys(this._tokens)
        // get it's balance
        .map(async token => {
          const amount = await this.getBalance({ token, address })
          return { token, amount }
        })

    return Promise.all(balancePromises)
  }

  async getExtraTokens ({ sellToken, buyToken, auctionIndex }) {
    assertAuction(sellToken, buyToken, auctionIndex)

    return this._callForAuction({
      operation: 'extraTokens',
      sellToken,
      buyToken,
      auctionIndex,
      checkTokens: false
    })
  }

  async getSellerBalance ({ sellToken, buyToken, auctionIndex, address }) {
    assertAuction(sellToken, buyToken, auctionIndex)
    assert(address, 'The address is required')

    return this._callForAuction({
      operation: 'sellerBalances',
      sellToken,
      buyToken,
      auctionIndex,
      args: [ address ],
      checkTokens: false
    })
  }

  async getBuyerBalance ({ sellToken, buyToken, auctionIndex, address }) {
    assertAuction(sellToken, buyToken, auctionIndex)
    assert(address, 'The address is required')

    return this._callForAuction({
      operation: 'buyerBalances',
      sellToken,
      buyToken,
      auctionIndex,
      args: [ address ],
      checkTokens: false
    })
  }

  async getClaimedAmounts ({ sellToken, buyToken, auctionIndex, address }) {
    assertAuction(sellToken, buyToken, auctionIndex)
    assert(address, 'The address is required')

    return this._callForAuction({
      operation: 'claimedAmounts',
      sellToken,
      buyToken,
      auctionIndex,
      args: [ address ],
      checkTokens: false
    })
  }

  async depositEther ({ from, amount }) {
    assert(from, 'The from param is required')
    assert(from, 'The amount is required')

    // deposit ether
    const eth = this._tokens.ETH
    return eth.deposit({ from, value: amount })
  }

  async getPriceEthUsd () {
    return this._priceOracle
      .getUSDETHPrice
      .call()
  }

  async approveERC20Token ({ token, from, amount }) {
    assert(token, 'The token is required')
    assert(from, 'The from param is required')
    assert(amount, 'The amount is required')

    // Let DX use the ether
    const tokenContract = this._getTokenContract(token)
    return tokenContract.approve(this._dx.address, amount, { from })
  }

  async transferERC20Token ({ token, from, to, amount }) {
    assert(token, 'The token is required')
    assert(from, 'The from param is required')
    assert(to, 'The to param is required')
    assert(amount, 'The amount is required')

    // Let DX use the ether
    const tokenContract = this._getTokenContract(token)
    return tokenContract.transfer(to, amount, { from })
  }

  async deposit ({ token, amount, from }) {
    assert(token, 'The token is required')
    assert(from, 'The from param is required')
    assert(amount, 'The amount is required')

    return this
      ._transactionForToken({
        operation: 'deposit',
        from,
        token,
        args: [ amount ], // new BigNumber(amount)
        checkToken: false
      })
      .then(toTransactionNumber)
  }

  async withdraw ({ token, amount, from }) {
    assert(token, 'The token is required')
    assert(from, 'The from param is required')
    assert(amount, 'The amount is required')

    return this
      ._transactionForToken({
        operation: 'withdraw',
        from,
        token,
        args: [ amount ]
      })
      .then(toTransactionNumber)
  }

  async postSellOrder ({
    sellToken, buyToken, auctionIndex, from, amount
  }) {
    /*
    auctionLogger.debug('postSellOrder: %o', {
      sellToken, buyToken, auctionIndex, from, amount
    })
    */

    assertAuction(sellToken, buyToken, auctionIndex)
    assert(from, 'The from param is required')
    assert(amount, 'The amount is required')

    assert(amount > 0, 'The amount must be a positive number')
    const actualAmount = await this._getMaxAmountAvaliable({
      token: sellToken,
      address: from,
      maxAmount: amount
    })
    // debug('amount: %d', amount)
    // debug('actualAmount: %d', actualAmount)
    assert.equal(toBigNumber(amount).toNumber(), actualAmount.toNumber(), "The user doesn't have enough tokens")

    const isApprovedMarket = await this.isApprovedMarket({ tokenA: sellToken, tokenB: buyToken })
    assert(isApprovedMarket, 'The token pair has not been approved')

    const auctionStart = await this.getAuctionStart({ sellToken, buyToken })
    const now = await this._getTime()

    const lastAuctionIndex = await this.getAuctionIndex({ sellToken, buyToken })
    if (auctionStart !== null && auctionStart <= now) {
      // The auction is running
      assert.equal(auctionIndex, lastAuctionIndex + 1,
        'The auction index should be set to the next auction (the auction is running)'
      )
    } else {
      // We are waiting (to start or for funding
      assert.equal(auctionIndex, lastAuctionIndex,
        'The auction index should be set to the current auction (we are in a waiting period)'
      )
    }

    // const auctionHasCleared = this._auctionHasCleared({ sellToken, buyToken, auctionIndex })
    // assert(auctionHasCleared, 'The auction has cleared')
    //
    //
    // assert(auctionStart != null, 'The auction is in a waiting period')
    //
    //
    // assert(auctionStart <= now, "The auction hasn't started yet")
    //
    //
    // assert.equal(auctionIndex, lastAuctionIndex, 'The provided index is not the index of the running auction')
    //
    // const sellVolume = await this.getSellVolume({ sellToken, buyToken })
    // assert(sellVolume > 0, "There's not selling volume")
    //
    // const buyVolume = await this.getBuyVolume({ sellToken, buyToken })
    // assert(buyVolume + amount < MAXIMUM_FUNDING, 'The buyVolume plus the amount cannot be greater than ' + MAXIMUM_FUNDING)

    return this
      ._transactionForAuction({
        operation: 'postSellOrder',
        from,
        sellToken,
        buyToken,
        auctionIndex,
        args: [ amount ]
      })
      .then(toTransactionNumber)
  }

  async postBuyOrder ({ sellToken, buyToken, auctionIndex, from, amount }) {
    auctionLogger.debug(sellToken, buyToken, 'postBuyOrder: %o', {
      buyToken, sellToken, auctionIndex, from, amount
    })
    assertAuction(sellToken, buyToken, auctionIndex)
    assert(from, 'The from param is required')
    assert(amount >= 0, 'The amount is required')

    const actualAmount = await this._getMaxAmountAvaliable({
      token: sellToken,
      address: from,
      maxAmount: amount
    })
    // debug('amount: %d', amount)
    // debug('actualAmount: %d', actualAmount)
    assert.equal(toBigNumber(amount).toNumber(), actualAmount.toNumber(), "The user doesn't have enough tokens")

    const auctionHasCleared = this._auctionHasCleared({ sellToken, buyToken, auctionIndex })
    assert(auctionHasCleared, 'The auction has cleared')

    const auctionStart = await this.getAuctionStart({ sellToken, buyToken })
    assert(auctionStart != null, 'The auction is in a waiting period')

    const now = await this._getTime()
    assert(auctionStart <= now, "The auction hasn't started yet")

    const lastAuctionIndex = await this.getAuctionIndex({ sellToken, buyToken })
    assert.equal(auctionIndex, lastAuctionIndex, 'The provided index is not the index of the running auction')

    const sellVolume = await this.getSellVolume({ sellToken, buyToken })
    assert(sellVolume > 0, "There's not selling volume")

    const buyVolume = await this.getBuyVolume({ sellToken, buyToken })
    assert(buyVolume.add(amount).toNumber() < MAXIMUM_FUNDING, `The buyVolume (${buyVolume}) plus the amount (${amount}) cannot be greater than ${MAXIMUM_FUNDING}`)

    return this
      ._transactionForAuction({
        operation: 'postBuyOrder',
        from,
        sellToken,
        buyToken,
        auctionIndex,
        args: [ amount ]
      })
      .then(toTransactionNumber)
  }

  async claimSellerFunds ({
    sellToken, buyToken, from, auctionIndex
  }) {
    assertAuction(sellToken, buyToken, auctionIndex)
    assert(from, 'The from param is required')

    // TODO: Review why the transaction needs address as a param as well
    return this
      ._transactionForPair({
        operation: 'claimSellerFunds',
        from,
        sellToken,
        buyToken,
        args: [ from, auctionIndex ]
      })
      .then(toTransactionNumber)
  }

  async claimBuyerFunds ({ sellToken, buyToken, from, auctionIndex }) {
    assertAuction(sellToken, buyToken, auctionIndex)
    assert(from, 'The from param is required')

    return this
      ._transactionForPair({
        operation: 'claimBuyerFunds',
        from,
        sellToken,
        buyToken,
        args: [ from, auctionIndex ]
      })
      .then(toTransactionNumber)
  }

  async getUnclaimedBuyerFunds ({ sellToken, buyToken, address, auctionIndex }) {
    assertAuction(sellToken, buyToken, auctionIndex)
    assert(address, 'The address is required')

    return this._callForPair({
      operation: 'getUnclaimedBuyerFunds',
      sellToken,
      buyToken,
      args: [address, auctionIndex],
      checkTokens: false
    })
  }

  async addTokenPair ({
    // address
    from,
    // Token A
    tokenA, tokenAFunding,
    // Token B
    tokenB, tokenBFunding,
    // Initial closing price
    initialClosingPrice
  }) {
    auctionLogger.debug(tokenA, tokenB,
      'Add new token pair: %s (%d), %s (%d). Price: %o. From %s ',
      tokenA, tokenAFunding,
      tokenB, tokenBFunding,
      initialClosingPrice,
      from
    )
    assertPair(tokenA, tokenB)
    assert(tokenAFunding >= 0, 'The founding for token A is incorrect')
    assert(tokenBFunding >= 0, 'The founding for token B is incorrect')
    assert(from, 'The from param is required')
    assert(initialClosingPrice, 'The initialClosingPrice is required')
    assert(initialClosingPrice.numerator >= 0, 'The initialClosingPrice numerator is incorrect')
    assert(initialClosingPrice.denominator >= 0, 'The initialClosingPrice denominator is incorrect')
    assert.notEqual(tokenA, tokenB)
    assert(initialClosingPrice.numerator > 0, 'Initial price numerator must be positive')
    assert(initialClosingPrice.denominator > 0, 'Initial price denominator must be positive')

    const actualAFounding = await this._getMaxAmountAvaliable({
      token: tokenA, address: from, maxAmount: tokenAFunding
    })

    const actualBFounding = await this._getMaxAmountAvaliable({
      token: tokenB, address: from, maxAmount: tokenBFunding
    })

    assert(actualAFounding < MAXIMUM_FUNDING, 'The funding cannot be greater than ' + MAXIMUM_FUNDING)
    assert(actualBFounding < MAXIMUM_FUNDING, 'The funding cannot be greater than ' + MAXIMUM_FUNDING)
    auctionLogger.debug(tokenA, tokenB, 'actual A Founding: %s', actualAFounding)
    auctionLogger.debug(tokenA, tokenB, 'actual B Founding: %s', actualBFounding)

    const isApprovedMarket = await this.isApprovedMarket({ tokenA, tokenB })
    /*
    auctionLogger.debug(tokenA, tokenB, 'Was %s-%s pair previouslly approved? %s',
      tokenA, tokenB, isApprovedMarket)
    */
    assert(!isApprovedMarket, 'The pair was previouslly added')

    // Ensure that we reach the minimun USD to add a token pair
    await this._assertMinimunFundingForAddToken({
      tokenA, actualAFounding, tokenB, actualBFounding
    })

    const tokenAAddress = await this._getTokenAddress(tokenA, false)
    const tokenBAddress = await this._getTokenAddress(tokenB, false)

    const params = [
      tokenAAddress, tokenBAddress,
      // we don't use the actual on porpuse (let the contract do that)
      tokenAFunding, tokenBFunding,
      initialClosingPrice.numerator,
      initialClosingPrice.denominator
    ]

    // debug('Add tokens with params: %o', params)
    return this
      ._doTransaction('addTokenPair', from, params)
      .then(toTransactionNumber)
  }

  async _assertMinimunFundingForAddToken ({ tokenA, actualAFounding, tokenB, actualBFounding }) {
    // get the funded value in USD
    let fundedValueUSD
    if (tokenA === 'ETH') {
      fundedValueUSD = await this._getPriceInUSD({
        token: tokenA,
        amount: actualAFounding
      })
    } else if (tokenB === 'ETH') {
      fundedValueUSD = await this._getPriceInUSD({
        token: tokenB,
        amount: actualBFounding
      })
    } else {
      const foundingAInUSD = await this._getPriceInUSD({
        token: tokenA,
        amount: actualAFounding
      })
      const foundingBInUSD = await this._getPriceInUSD({
        token: tokenB,
        amount: actualBFounding
      })
      fundedValueUSD = foundingAInUSD.add(foundingBInUSD)
    }

    auctionLogger.debug(tokenA, tokenB, 'Price in USD for the initial funding', fundedValueUSD)
    assert(fundedValueUSD.toNumber() > THRESHOLD_NEW_TOKEN_PAIR, `Not enough founding. \
Actual USD founding ${fundedValueUSD}. Required founding ${THRESHOLD_NEW_TOKEN_PAIR}`)
  }

  async getFundingInUSD ({ tokenA, tokenB, auctionIndex }) {
    // auctionLogger.debug(tokenA, tokenB, `getFundingInUSD for auction ${auctionIndex}`)
    const currentAuctionIndex = await this.getAuctionIndex({
      sellToken: tokenA, buyToken: tokenB
    })
    let getSellVolumeFn
    if (auctionIndex === currentAuctionIndex) {
      getSellVolumeFn = 'getSellVolume'
    } else if (auctionIndex === currentAuctionIndex + 1) {
      getSellVolumeFn = 'getSellVolumeNext'
    } else {
      throw new Error(`The sell volume can only be obtained for the current \
auction or the next one. auctionIndex=${auctionIndex}, \
currentAuctionIndex=${currentAuctionIndex}`)
    }

    const sellVolumeA = await this[getSellVolumeFn]({ sellToken: tokenA, buyToken: tokenB })
    const sellVolumeB = await this[getSellVolumeFn]({ sellToken: tokenB, buyToken: tokenA })

    const foundingA = await this._getPriceInUSD({
      token: tokenA,
      amount: sellVolumeA
    })

    const foundingB = await this._getPriceInUSD({
      token: tokenB,
      amount: sellVolumeB
    })

    return {
      foundingA,
      foundingB
    }
  }

  async _getPriceInUSD ({ token, amount }) {
    const ethUsdPrice = await this.getPriceEthUsd()
    logger.debug('Eth/Usd Price for %s: %d', token, ethUsdPrice)
    let amountInETH
    if (token === 'ETH') {
      amountInETH = amount
    } else {
      const priceTokenETH = await this.getPriceInEth({ token })

      logger.debug('Price in ETH for %s: %d', token, priceTokenETH)
      amountInETH = amount
        .mul(priceTokenETH.numerator)
        .div(priceTokenETH.denominator)
    }

    return amountInETH
      .mul(ethUsdPrice)
      .div(1e18)
  }

  async getPriceFromUSDInTokens ({ token, amount }) {
    const ethUsdPrice = await this.getPriceEthUsd()
    logger.debug('Eth/Usd Price for %s: %d', token, ethUsdPrice)
    let amountInETH = amount.div(ethUsdPrice)

    let amountInToken
    if (token === 'ETH') {
      amountInToken = amountInETH
    } else {
      const priceTokenETH = await this.getPriceInEth({ token })

      logger.debug('Price of token %s in ETH: %d', token, priceTokenETH)
      amountInToken = amountInETH
        .mul(priceTokenETH.denominator)
        .div(priceTokenETH.numerator)
    }

    return amountInToken.mul(1e18)
  }

  async getPrice ({ sellToken, buyToken, auctionIndex }) {
    assertAuction(sellToken, buyToken, auctionIndex)

    return this
      ._callForAuction({
        operation: 'getPriceForJS',
        sellToken,
        buyToken,
        auctionIndex,
        checkTokens: false
      })
      .then(toFraction)
  }

  async getPriceInEth ({ token }) {
    assert(token, 'The token is required')
    // If none of the token are ETH, we make sure the market <token>/ETH exists
    const tokenEthMarketExists = await this.isApprovedMarket({
      tokenA: token,
      tokenB: 'ETH'
    })
    assert(tokenEthMarketExists, `The market ${token}-ETH doesn't`)

    return this
      ._callForToken({
        operation: 'getPriceOracleForJS',
        token,
        checkToken: false
      })
      .then(toFraction)
  }

  async getClosingPrices ({ sellToken, buyToken, auctionIndex }) {
    assertAuction(sellToken, buyToken, auctionIndex)
    return this
      ._callForAuction({
        operation: 'closingPrices',
        sellToken,
        buyToken,
        auctionIndex,
        checkTokens: false
      })
      .then(toFraction)
  }

  async _getAuctionState ({ sellToken, buyToken, auctionIndex }) {
    assertAuction(sellToken, buyToken, auctionIndex)

    // auctionLogger.debug(sellToken, buyToken, '_getAuctionState: %d', auctionIndex)
    let buyVolume = await this.getBuyVolume({ sellToken, buyToken })
    let sellVolume = await this.getSellVolume({ sellToken, buyToken })
    /*
    auctionLogger.debug(sellToken, buyToken,
      '_getIsClosedState(%s-%s): buyVolume: %d, sellVolume: %d',
      sellToken, buyToken,
      buyVolume, sellVolume
    )
    */

    const price = await this.getPrice({ sellToken, buyToken, auctionIndex })
    let isTheoreticalClosed = null
    if (price) {
      /*
      auctionLogger.debug(sellToken, buyToken, 'Auction index: %d, Price: %d/%d %s/%s',
        auctionIndex, price.numerator, price.denominator,
        sellToken, buyToken
      )
      */

      // (Pn x SV) / (Pd x BV)
      // example:
      isTheoreticalClosed = price.numerator
        .mul(sellVolume)
        .sub(price.denominator
          .mul(buyVolume)
        ).toNumber() === 0
    } else {
      isTheoreticalClosed = false
    }

    let closingPrice = await this.getClosingPrices({
      sellToken, buyToken, auctionIndex
    })
    /*
    debug('_getIsClosedState(%s-%s): Closing price: %d/%d',
      sellToken, buyToken,
      closingPrice.numerator, closingPrice.denominator
    )
    */
    const isClosed = closingPrice !== null
    /*
    debug('_getIsClosedState(%s-%s): is closed? %s. Is theoretical closed? %s',
      sellToken, buyToken,
      isClosed, isTheoreticalClosed
    )
    */

    return {
      buyVolume,
      sellVolume,
      closingPrice,
      isClosed,
      isTheoreticalClosed
    }
  }

  _auctionHasCleared ({ sellToken, buyToken, auctionIndex }) {
    assertAuction(sellToken, buyToken, auctionIndex)
    const closingPrice = this.getClosingPrices({ sellToken, buyToken, auctionIndex })

    return closingPrice.denominator !== 0
  }

  async _getMaxAmountAvaliable ({ token, address, maxAmount }) {
    const balance = await this.getBalance({ token, address })
    // console.log('MIN', balance.toNumber(), maxAmount)
    return BigNumber.min(balance, maxAmount)
  }

  _getTokenContract (token) {
    const tokenContract = this._tokens[token]
    if (!tokenContract) {
      const knownTokens = Object.keys(this._tokens)
      throw new Error(`Unknown token ${token}. Known tokens are ${knownTokens}`)
    }
    return tokenContract
  }

  async _getTokenAddress (token, check = true) {
    const tokenAddress = this._getTokenContract(token).address
    if (check) {
      const isApprovedToken = await this.isApprovedToken({ token })

      if (!isApprovedToken) {
        throw Error(`${token} is not an approved token`)
      }
    }

    return tokenAddress
  }

  async _callForToken ({ operation, token, args = [], checkToken = true }) {
    /*
    debug('Get "%s" for token %s. Args: %s',
      operation, token, args)
    */

    const tokenAddress = await this._getTokenAddress(token, checkToken)
    const params = [tokenAddress, ...args]

    // debug('Call "%s" with params: [%s]', operation, params.join(', '))

    // return this._dx[operation].call(...params)
    return this._debugOperation({ operation, params })
  }

  async _callForPair ({ operation, sellToken, buyToken, args = [], checkTokens = true }) {
    /*
    debug('Get "%s" for pair %s-%s. Args: %s',
      operation, sellToken, buyToken, args)
      */
    const sellTokenAddress = await this._getTokenAddress(sellToken, checkTokens)
    const buyTokenAddress = await this._getTokenAddress(buyToken, checkTokens)
    const params = [ sellTokenAddress, buyTokenAddress, ...args ]

    // return this._dx[operation].call(...params)
    return this._debugOperation({ operation, params })
  }

  async _callForAuction ({
    operation,
    sellToken,
    buyToken,
    auctionIndex,
    args = [],
    checkTokens = true
  }) {
    /*
    debug('Get %s for auction %d of pair %s-%s',
      operation, auctionIndex, sellToken, buyToken
    )
    */
    const sellTokenAddress = await this._getTokenAddress(sellToken, checkTokens)
    const buyTokenAddress = await this._getTokenAddress(buyToken, checkTokens)
    const params = [ sellTokenAddress, buyTokenAddress, auctionIndex, ...args ]

    // return this._dx[operation].call(...params)
    return this._debugOperation({ operation, params })
  }

  async _transactionForToken ({ operation, from, token, args = [], checkToken }) {
    logger.debug('Execute transaction "%s" (from %s) for token %s. Args: %s',
      operation, from, token, args
    )
    const tokenAddress = await this._getTokenAddress(token, checkToken)

    const params = [
      tokenAddress,
      ...args
    ]

    // logger.debug('Params: %o', params)
    return this._doTransaction(operation, from, params)
  }

  async _transactionForPair ({
    operation, from, sellToken, buyToken, args = [], checkTokens
  }) {
    auctionLogger.debug(sellToken, buyToken, 'Execute transaction "%s" (from %s)',
      operation, from
    )
    const sellTokenAddress = await this._getTokenAddress(sellToken, checkTokens)
    const buyTokenAddress = await this._getTokenAddress(buyToken, checkTokens)

    const params = [
      sellTokenAddress,
      buyTokenAddress,
      ...args
    ]
    return this._doTransaction(operation, from, params)
  }

  async _debugOperation ({ operation, params }) {
    return this._dx[operation]
      .call(...params)
      .catch(e => {
        console.error('ERROR: Call %s with params: [%s]', operation, params.join(', '))
        throw e
      })
  }

  async _transactionForAuction ({
    operation,
    from,
    sellToken,
    buyToken,
    auctionIndex,
    args = [],
    checkTokens
  }) {
    auctionLogger.debug(sellToken, buyToken,
      'Execute transaction %s (address %s) for auction %d',
      operation, from, auctionIndex
    )
    const sellTokenAddress = await this._getTokenAddress(sellToken, checkTokens)
    const buyTokenAddress = await this._getTokenAddress(buyToken, checkTokens)
    const params = [
      sellTokenAddress,
      buyTokenAddress,
      auctionIndex,
      ...args
    ]
    return this._doTransaction(operation, from, params)
  }

  async _doTransaction (operation, from, params) {
    logger.debug('_doTransaction: %o', {
      operation,
      from,
      params
    })
    /*
    const estimatedGas = await this
      ._dx[operation]
      .estimateGas(...params, {
        from
      })

    logger.debug('_doTransaction. Estimated gas for "%s": %d', operation, estimatedGas)
    // const gas = estimatedGas // * 1.15
    */

    return this
      ._dx[operation](...params, {
        from,
        gas: this._defaultGas,
        gasPrice: this._gasPrice
      }).catch(error => {
        logger.error('Error on transaction "%s", from "%s". Params: [%s]. Error: %s',
          operation, from, params, error
        )
        // Rethrow error after logging
        throw error
      })
  }

  async _getTime () {
    let now
    if (isLocal) {
      now = await this._ethereumClient.geLastBlockTime()
    } else {
      now = new Date()
    }

    return now
  }
}

function toFraction ([ numerator, denominator ]) {
  // the contract return 0/0 when something is undetermined
  if (numerator.isZero() && denominator.isZero()) {
    return null
  } else {
    return { numerator, denominator }
  }
}

function toTransactionNumber (transactionResult) {
  return transactionResult.tx
}

function epochToDate (epoch) {
  return new Date(epoch * 1000)
}

function assertPair (sellToken, buyToken) {
  assert(sellToken, 'The sell token is required')
  assert(buyToken, 'The buy token is required')
}

function assertAuction (sellToken, buyToken, auctionIndex) {
  assertPair(sellToken, buyToken)
  assert(auctionIndex >= 0, 'The auction index is invalid')
}

module.exports = AuctionRepoImpl
