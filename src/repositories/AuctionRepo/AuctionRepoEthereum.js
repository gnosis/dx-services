const debug = require('debug')('dx-service:repositories:AuctionRepoEthereum')
const AUCTION_START_FOR_WAITING_FOR_FUNDING = 1
// const BigNumber = require('bignumber.js')

/*
  // TODO: Events
  event NewDeposit(
       address indexed token,
       uint indexed amount
  );

  event NewWithdrawal(
      address indexed token,
      uint indexed amount
  );

  event NewSellOrder(
      address indexed sellToken,
      address indexed buyToken,
      address indexed user,
      uint auctionIndex,
      uint amount
  );

  event NewBuyOrder(
      address indexed sellToken,
      address indexed buyToken,
      address indexed user,
      uint auctionIndex,
      uint amount
  );

  event NewSellerFundsClaim(
      address indexed sellToken,
      address indexed buyToken,
      address indexed user,
      uint auctionIndex,
      uint amount
  );

  event NewBuyerFundsClaim(
      address indexed sellToken,
      address indexed buyToken,
      address indexed user,
      uint auctionIndex,
      uint amount
  );

  event NewTokenPair(
      address sellToken,
      address buyToken
  );

  event AuctionCleared(
      address sellToken,
      address buyToken,
      uint sellVolume,
      uint buyVolume,
      uint auctionIndex
  );

  event Log(
      string l
  );

  event LogOustandingVolume(
      uint l
  );

  event LogNumber(
      string l,
      uint n
  );

  event ClaimBuyerFunds (
      uint returned,
      uint tulipsIssued
  );
*/

class AuctionRepoEthereum {
  constructor ({
    ethereumClient,
    contractDefinitions,
    dxContractAddress = null,
    gnoTokenAddress = null,
    erc20TokenAddresses = {},
    devContractsBaseDir
  }) {
    this._ethereumClient = ethereumClient
    this._contractDefinitions = contractDefinitions
    this._dxContractAddress = dxContractAddress
    this._gnoTokenAddress = gnoTokenAddress
    this._erc20TokenAddresses = erc20TokenAddresses
    this._devContractsBaseDir = devContractsBaseDir

    // Load the contracts
    this.ready = this._loadContracts()
      .then(({ dx, priceOracle, gno, eth, tul, owl, erc20TokenContracts }) => {
        this._dx = dx
        this._priceOracle = priceOracle

        this._tokens = Object.assign({
          GNO: gno,
          ETH: eth,
          TUL: tul,
          OWL: owl
        }, erc20TokenContracts)

        debug(`DX contract in address %s`, this._dx.address)
        debug(`Price Oracle in address %s`, this._priceOracle.address)
        Object
          .keys(this._tokens)
          .forEach(token => {
            const contract = this._tokens[token]
            debug(`Token %s in address %s`,
              token,
              contract.address
            )
          })
        /*
        this._eth = eth
        this._tul = tul
        this._owl = owl
        */
      })
  }

  async getBasicInfo () {
    // debug('Get auction basic info')
    const ownerAddress = await this._dx.owner.call()

    return {
      network: this._ethereumClient.getUrl(),
      ownerAddress: ownerAddress,
      exchageAddress: this._dx.address,
      blockNumber: this._ethereumClient.getBlockNumber()
    }
  }

  async getStateInfo ({ sellToken, buyToken }) {
    const auctionStart = await this.getAuctionStart({ sellToken, buyToken })
    const auctionIndex = await this.getAuctionIndex({ sellToken, buyToken })

    // debug('Get state for %s-%s', tokenA, tokenB)
    // debug('Auction starts: %s', auctionStart)

    return {
      auctionIndex,
      auctionStart,

      // auction: buyVolume, sellVolume, closingPrice, isClosed, isTheoreticalClosed,
      auction: await this._getAuctionState({
        sellToken: sellToken,
        buyToken: buyToken,
        auctionIndex
      }),

      // auctionOpp: buyVolume, sellVolume, closingPrice, isClosed, isTheoreticalClosed,
      auctionOpp: await this._getAuctionState({
        sellToken: buyToken,
        buyToken: sellToken,
        auctionIndex
      })
    }
  }

  async getState ({ sellToken, buyToken }) {
    const {
      auctionStart,
      auction,
      auctionOpp
    } = await this.getStateInfo({ sellToken, buyToken })

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

    const now = new Date()
    if (auctionStart === null) {
      // We havent surplus the threshold (or it's the first auction)
      return 'WAITING_FOR_FUNDING'
    } else if (auctionStart >= now) {
      return 'WAITING_FOR_AUCTION_TO_START'
    } else if (isTheoreticalClosed || isTheoreticalClosedOpp) {
      return 'PENDING_CLOSE_THEORETICAL'
    } else if (
        isClosed && !isClosedOpp ||
        !isClosed && isClosedOpp) {
      return 'ONE_AUCTION_HAS_CLOSED'
    } else {
      return 'RUNNING'
    }
  }


  // TODO: Review this logic. This are the states of the diagram
  // (not used right now)
  async getState2 ({ sellToken, buyToken }) {
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
        (sellVolume === 0   && isTheoreticalClosedOpp) ||
        (sellVolumeOp === 0 && isTheoreticalClosed)) {
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


  async _getAuctionState ({ sellToken, buyToken, auctionIndex }) {
    const price = await this.getPrice({ sellToken, buyToken, auctionIndex })
    let buyVolume = await this.getBuyVolume({ sellToken, buyToken })
    let sellVolume = await this.getSellVolume({ sellToken, buyToken })

    /*
    debug('Auction index: %d, Price: %d/%d %s/%s',
      auctionIndex, price.numerator, price.denominator,
      sellToken, buyToken
    )
    debug('_getIsClosedState(%s-%s): buyVolume: %d, sellVolume: %d',
      sellToken, buyToken,
      buyVolume, sellVolume
    )
    */
    const isTheoreticalClosed = (
      // (Pn x SV) / (Pd x BV)
      price
        .numerator
        .mul(sellVolume)
        .sub(
          price
            .denominator
            .mul(buyVolume)
        ).toNumber() === 0)

    let closingPrice = await this.getClosingPrices({
      sellToken, buyToken, auctionIndex
    })
    /*
    debug('_getIsClosedState(%s-%s): Closing price: %d/%d',
      sellToken, buyToken,
      closingPrice.numerator, closingPrice.denominator
    )
    */
    const isClosed = (closingPrice.numerator.toNumber() > 0)
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

  async getAuctionIndex ({ sellToken, buyToken }) {
    return this._callForPair({
      operation: 'getAuctionIndex',
      sellToken,
      buyToken
    })
  }

  async getAuctionStart ({ sellToken, buyToken }) {
    const auctionStartEpoch = await this._callForPair({
      operation: 'getAuctionStart',
      sellToken,
      buyToken
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
    return this._transactionForToken({
      operation: 'updateApprovalOfToken',
      from,
      token: token,
      args: [ isApproved ? 1 : 0 ],
      checkToken: false
    })
  }

  async isApprovedToken ({ token }) {
    return this._callForToken({
      operation: 'approvedTokens',
      token: token,
      checkToken: false
    })
  }

  // TODO: getCurrencies?

  async getSellVolume ({ sellToken, buyToken }) {
    return this._callForPair({
      operation: 'sellVolumesCurrent',
      sellToken,
      buyToken
    })
  }

  async getSellVolumeNext ({ sellToken, buyToken }) {
    return this._callForPair({
      operation: 'sellVolumesNext',
      sellToken,
      buyToken
    })
  }

  async getBuyVolume ({ sellToken, buyToken }) {
    return this._callForPair({
      operation: 'buyVolumes',
      sellToken,
      buyToken
    })
  }

  async getBalance ({ token, address }) {
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
    debug('Get balances for %s', address)
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
    return this._callForAuction({
      operation: 'extraTokens',
      sellToken,
      buyToken,
      auctionIndex
    })
  }

  async getSellerBalance ({ sellToken, buyToken, auctionIndex, address }) {
    return this._callForAuction({
      operation: 'sellerBalances',
      sellToken,
      buyToken,
      auctionIndex,
      args: [ address ]
    })
  }

  async getBuyerBalance ({ sellToken, buyToken, auctionIndex, address }) {
    return this._callForAuction({
      operation: 'buyerBalances',
      sellToken,
      buyToken,
      auctionIndex,
      args: [ address ]
    })
  }

  async getClaimedAmounts ({ sellToken, buyToken, auctionIndex, address }) {
    return this._callForAuction({
      operation: 'claimedAmounts',
      sellToken,
      buyToken,
      auctionIndex,
      args: [ address ]
    })
  }

  async depositEther ({ from, amount }) {
    const eth = this._tokens.ETH
    // deposit ether
    eth.deposit({ from, value: amount })

    // Let DX use the ether
    eth.approve(this._dx.address, amount, { from })
  }

  async deposit ({ token, amount, from }) {
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
    // TODO: Review validations for doing them before calling the DX

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
    // TODO: Review validations for doing them before calling the DX
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
    return this._callForPair({
      operation: 'getUnclaimedBuyerFunds',
      sellToken,
      buyToken,
      args: [address, auctionIndex]
    })
  }

  async addTokenPair ({
    // address
    address,
    // Token A
    tokenA, tokenAFunding,
    // Token B
    tokenB, tokenBFunding,
    // Initial closing price
    initialClosingPrice
  }) {
    // TODO: Validations. There are some restrictions. Try to make validations
    // before sending the transactio to save GAS
    //  - Tokens different
    //  - if one token is ETH: We just use it for calculating the price
    //      * NOTE: The price is set by the one using it's ETH as collateral
    //  - if none is ETH, we make sure we have price for TOKENA-ETH and
    //    TOKENB-ETH
    //      * NOTE: The price is set by the market (previous auctions)
    //  - Check we have enough funding (10.000 USD)
    //  - addTokenPair2
    debug('Add new token pair: %s (%d), %s (%d). Price: %o. Addres %s ',
      tokenA, tokenAFunding,
      tokenB, tokenBFunding,
      initialClosingPrice,
      address
    )
    const tokenAAddress = await this._getTokenAddress(tokenA, false)
    const tokenBAddress = await this._getTokenAddress(tokenB, false)

    const params = [
      tokenAAddress, tokenBAddress,
      tokenAFunding, tokenBFunding,
      initialClosingPrice.numerator,
      initialClosingPrice.denominator
    ]
    return this
      ._doTransaction('addTokenPair', address, params)
      .then(toTransactionNumber)
  }

  async getPrice ({ sellToken, buyToken, auctionIndex }) {
    return this
      ._callForAuction({
        operation: 'getPriceForJS',
        sellToken,
        buyToken,
        auctionIndex
      })
      .then(toFraction)
  }

  async getPriceOracle ({ token }) {
    return this
      ._callForToken({
        operation: 'getPriceOracleForJS',
        token
      })
      .then(toFraction)
  }

  async getClosingPrices ({ sellToken, buyToken, auctionIndex }) {
    return this
      ._callForAuction({
        operation: 'closingPrices',
        sellToken,
        buyToken,
        auctionIndex
      })
      .then(toFraction)
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
    debug('Get "%s" for token %s. Args: %s',
      operation, token, args)

    const tokenAddress = await this._getTokenAddress(token, checkToken)
    debug('tokenAddress: %s', tokenAddress)

    return this._dx[operation]
      .call(tokenAddress, ...args)
  }

  async _callForPair ({ operation, sellToken, buyToken, args, checkTokens = true }) {
    // debug('Get %s for pair %s-%s', operation, sellToken, buyToken)
    const sellTokenAddress = await this._getTokenAddress(sellToken, checkTokens)
    const buyTokenAddress = await this._getTokenAddress(buyToken, checkTokens)

    return this._dx.approvedTokens
      .call(sellTokenAddress, buyTokenAddress, ...args)
  }

  async _callForAuction ({
    operation,
    sellToken,
    buyToken,
    auctionIndex,
    args,
    checkTokens = true
  }) {
    /*
    debug('Get %s for auction %d of pair %s-%s',
      operation, auctionIndex, sellToken, buyToken
    )
    */
    const sellTokenAddress = await this._getTokenAddress(sellToken, checkTokens)
    const buyTokenAddress = await this._getTokenAddress(buyToken, checkTokens)

    return this._dx[operation]
      .call(sellTokenAddress, buyTokenAddress, auctionIndex, ...args)
  }

  async _transactionForToken ({ operation, from, token, args, checkToken }) {
    debug('Execute transaction "%s" (from %s) for token %s',
      operation, from, token
    )
    const tokenAddress = await await this._getTokenAddress(token, checkToken)

    const params = [
      tokenAddress,
      ...args
    ]

    // debug('Params: %o', params)
    return this._doTransaction(operation, from, params)
  }

  async _transactionForPair ({
    transactionMethod, from, sellToken, buyToken, args, checkTokens
  }) {
    debug('Execute transaction "%s" (from %s) for pair %s-%s',
      transactionMethod, from, sellToken, buyToken
    )
    const sellTokenAddress = await this._getTokenAddress(sellToken, checkTokens)
    const buyTokenAddress = await this._getTokenAddress(buyToken, checkTokens)

    const params = [
      sellTokenAddress,
      buyTokenAddress,
      ...args
    ]
    return this._doTransaction(transactionMethod, from, params)
  }

  async _transactionForAuction ({
    transactionMethod,
    from,
    sellToken,
    buyToken,
    auctionIndex,
    args,
    checkTokens
  }) {
    debug('Execute transaction %s (address %s) for auction %d of the pair %s-%s',
      transactionMethod, from, auctionIndex, sellToken, buyToken
    )
    const sellTokenAddress = await this._getTokenAddress(sellToken, checkTokens)
    const buyTokenAddress = await this._getTokenAddress(buyToken, checkTokens)
    const params = [
      sellTokenAddress,
      buyTokenAddress,
      auctionIndex,
      ...args
    ]
    return this._doTransaction(transactionMethod, from, params)
  }

  async _doTransaction (transactionMethod, from, params) {
    debug('_doTransaction: %o', {
      transactionMethod,
      from,
      params
    })
    const estimatedGas = await this
      ._dx[transactionMethod]
      .estimateGas(...params, {
        from
      })

    debug('_doTransaction. Estimated gas for "%s": %d', transactionMethod, estimatedGas)
    return this
      ._dx[transactionMethod](...params, {
        from,
        gas: estimatedGas * 1.5
      })
  }

  async _loadDx () {
    const dxContract = this._ethereumClient
      .loadContract(this._contractDefinitions.DutchExchange)

    let dxContractAddress
    if (this._dxContractAddress) {
      dxContractAddress = this._dxContractAddress
    } else {
      // TODO: Raise error if not in development
      const proxyContract = this._ethereumClient
        .loadContract(this._contractDefinitions.DutchExchangeProxy)

      const dxProxy = await proxyContract.deployed()
      dxContractAddress = dxProxy.address

      this._dxMaster = await dxContract.deployed()
    }
    return dxContract.at(dxContractAddress)
  }

  async _loadERC20tokenContract (token, tokenContract) {
    let address = this._erc20TokenAddresses[token]
    if (!address) {
      // TODO: Rise error if not in development
      address = await this._ethereumClient
        .loadContract(`${this._devContractsBaseDir}/Token${token}`)
        .deployed()
        .then(contract => contract.address)
    }
    return {
      token,
      contract: tokenContract.at(address)
    }
  }

  async _loadGnoContract () {
    const gnoTokenContract = this._ethereumClient
      .loadContract(this._contractDefinitions.TokenGNO)

    // GNO can be pulled from the OWLAirdrop (the minter of the OWLToken)
    // For now, we jsut assume we get the address in the config file
    let address = this._gnoTokenAddress
    if (!address) {
      // TODO: Rise error if not in development
      address = await gnoTokenContract
        .deployed()
        .then(contract => contract.address)
    }

    return gnoTokenContract.at(address)
  }

  async _loadTokenContracts () {
    const standardTokenContract = this._ethereumClient
      .loadContract(this._contractDefinitions.StandardToken)

    const tokenContractList = await Promise.all(
      Object
        .keys(this._erc20TokenAddresses)
        .map(token => {
          return this._loadERC20tokenContract(token, standardTokenContract)
        })
    )

    return tokenContractList.reduce((tokenContractsAux, contractInfo) => {
      tokenContractsAux[contractInfo.token] = contractInfo.contract
      return tokenContractsAux
    }, {})
  }

  async _loadDxContracts (dx) {
    const etherTokenContract = this._ethereumClient
      .loadContract(this._contractDefinitions.EtherToken)

    const tulTokenContract = this._ethereumClient
      .loadContract(this._contractDefinitions.TokenTUL)

    /* TODO: Get GNO from OWL address? ? */
    const owlTokenContract = this._ethereumClient
      .loadContract(this._contractDefinitions.TokenOWL)

    /*
    const gnoTokenContract = this._ethereumClient
      .loadContract(this._contractDefinitions.TokenGNO)
    */

    const priceOracleContract = this._ethereumClient
      .loadContract(this._contractDefinitions.PriceOracleInterface)

    const [ priceOracle, eth, tul, owl, gno ] = await Promise.all([
      // load addresses from DX
      dx.ETHUSDOracle.call(),
      dx.ETH.call(),
      dx.TUL.call(),
      dx.OWL.call() // TODO: Is this the PROXY??
    ])
      // load instances of the contract
      .then(([ priceOracleAddress, ethAddress, tulAddress, owlAddress ]) => (
        Promise.all([
          priceOracleContract.at(priceOracleAddress),
          etherTokenContract.at(ethAddress),
          tulTokenContract.at(tulAddress),
          owlTokenContract.at(owlAddress),
          this._loadGnoContract()
        ]))
      )
    return {
      priceOracle,
      eth,
      tul,
      owl,
      gno
    }
  }

  async _loadContracts () {
    const [ dx, erc20TokenContracts ] = await Promise.all([
      this._loadDx(),
      this._loadTokenContracts()
    ])

    const dxContracts = await this._loadDxContracts(dx)

    return { dx, ...dxContracts, erc20TokenContracts }
  }
}

function toFraction ([ numerator, denominator ]) {
  return { numerator, denominator }
}

function toTransactionNumber (transactionResult) {
  return transactionResult.tx
}

function epochToDate (epoch) {
  return new Date(epoch * 1000)
}

module.exports = AuctionRepoEthereum
