const debug = require('debug')('dx-service:repositories:AuctionRepoEthereum')
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

const contractNames = [
  'DutchExchange',
  'PriceOracleInterface'
]

const mainTokenSymbols = ['GNO', 'OWL', 'TUL', 'ETH']

// TODO: Review. We coud instead of using adhoc tokens, work agais ERC20
//  interface and provide a register method to add a new token (with address)
const erc20tokensSymbols = ['OMG', 'RDN']

class AuctionRepoEthereum {
  constructor ({ ethereumClient, contractsBaseDir, contractsBaseDirDx }) {
    this._ethereumClient = ethereumClient
    this._contractsBaseDir = contractsBaseDir
    this._contractsBaseDirDx = contractsBaseDirDx

    const toContractName = symbol => symbol === 'ETH' ? 'EtherToken' : `Token${symbol}`
    const mainTokenContractNames = mainTokenSymbols.map(toContractName)
    const erc20TokenContractNames = erc20tokensSymbols.map(toContractName)

    // Load contracts
    this.ready = Promise.all([
      // load contracts
      this._ethereumClient.loadContracts({
        contractNames: contractNames,
        contractsBaseDir: contractsBaseDirDx
      }),
      // load main tokens
      this._ethereumClient.loadContracts({
        contractNames: mainTokenContractNames,
        contractsBaseDir: contractsBaseDirDx
      }),
      // load ERC20 tokens
      this._ethereumClient.loadContracts({
        contractNames: erc20TokenContractNames,
        contractsBaseDir: contractsBaseDir
      })
    ])
      .then(([ contracts, mainTokensContracts, erc20TokensContracts ]) => {
        const tokenSymbols =
          mainTokenSymbols.concat(erc20tokensSymbols)
        const tokenContracts = Object.assign({},
          mainTokensContracts, erc20TokensContracts
        )

        const tokens = tokenSymbols
          .reduce((tokensAccumulator, symbol) => {
            tokensAccumulator[symbol] = tokenContracts[toContractName(symbol)]
            return tokensAccumulator
          }, {})

        // Save contracts in a handy way for later use (_contracts, _tokens)
        this._contracts = contracts
        this._tokens = tokens
        this._dx = this._contracts.DutchExchange // just a handy alias
      })
  }

  async getBasicInfo () {
    debug('Get auction basic info')
    const ownerAddress = await this._dx.owner.call()

    return {
      network: this._ethereumClient.getUrl(),
      ownerAddress: ownerAddress,
      exchageAddress: this._dx.address,
      blockNumber: this._ethereumClient.getBlockNumber()
    }
  }

  async getCurrentAuctionIndex ({ tokenA, tokenB }) {
    return this._callForPair('getAuctionIndex', tokenA, tokenB)
  }

  async getAuctionStart ({ tokenA, tokenB }) {
    return this._callForPair('getAuctionStart', tokenA, tokenB)
  }

  async isAprovedToken ({ token }) {
    return this._callForToken('approvedTokens', token)
  }

  async gerSellVolume ({ sellToken, buyToken }) {
    return this._callForPair('sellVolumesCurrent', sellToken, buyToken)
  }

  async gerSellVolumeNext ({ sellToken, buyToken }) {
    return this._callForPair('sellVolumesNext', sellToken, buyToken)
  }

  async gerBuyVolume ({ sellToken, buyToken }) {
    return this._callForPair('buyVolumes', sellToken, buyToken)
  }

  async getBalance ({ token, address }) {
    return this._callForToken('balances', token, address)
  }

  async getBalances ({ address }) {
    debug('Get balances for %s', address)
    const balancePromises =
      // for every token
      Object.keys(this._tokens)
        // get it's balance
        .map(async token => {
          const balance = await this.getBalance({ token, address })
          return { token, balance }
        })

    return Promise.all(balancePromises)
  }

  async getExtraTokens ({ sellToken, buyToken, auctionIndex }) {
    return this._callForAuction('extraTokens',
      sellToken, buyToken, auctionIndex
    )
  }

  async getSellerBalance ({ sellToken, buyToken, auctionIndex, address }) {
    return this._callForAuction('sellerBalances',
      sellToken, buyToken, auctionIndex, address
    )
  }

  async getBuyerBalance ({ sellToken, buyToken, auctionIndex, address }) {
    return this._callForAuction('buyerBalances',
      sellToken, buyToken, auctionIndex, address
    )
  }

  async getClaimedAmounts ({ sellToken, buyToken, auctionIndex, address }) {
    return this._callForAuction('claimedAmounts',
      sellToken, buyToken, auctionIndex, address
    )
  }

  async deposit ({ token, amount, address }) {
    return this
      ._transactionForToken('deposit', address, token, amount)
      .then(toTransactionNumber)
  }

  async withdraw ({ token, amount, address }) {
    return this
      ._transactionForToken('withdraw', address, token, amount)
      .then(toTransactionNumber)
  }

  async postSellOrder ({
    sellToken, buyToken, auctionIndex = 0, address, amount
  }) {
    // TODO: Review validations for doing them before calling the DX

    return this
      ._transactionForAuction('postSellOrder',
        address, sellToken, buyToken, auctionIndex, amount
      )
      .then(toTransactionNumber)
  }

  async postBuyOrder ({ sellToken, buyToken, auctionIndex, address, amount }) {
    // TODO: Review validations for doing them before calling the DX
    return this
      ._transactionForAuction('postBuyOrder',
        address, sellToken, buyToken, auctionIndex, amount
      )
      .then(toTransactionNumber)
  }

  async claimSellerFunds ({
    sellToken, buyToken, address, auctionIndex
  }) {
    // TODO: Review why the transaction needs address as a param as well
    return this
      ._transactionForPair('claimSellerFunds',
        address, sellToken, buyToken, address, auctionIndex
      )
      .then(toTransactionNumber)
  }

  async claimBuyerFunds ({ sellToken, buyToken, address, auctionIndex }) {
    return this
      ._transactionForPair('claimBuyerFunds',
        address, sellToken, buyToken, address, auctionIndex
      )
      .then(toTransactionNumber)
  }

  async getUnclaimedBuyerFunds ({ sellToken, buyToken, address, auctionIndex }) {
    return this._callForPair('getUnclaimedBuyerFunds',
      sellToken, buyToken, address, auctionIndex
    )
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
    const tokenAAddress = this._getTokenAddress(tokenA)
    const tokenBAddress = this._getTokenAddress(tokenB)
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
      ._callForAuction('getPriceForJS', sellToken, buyToken, auctionIndex)
      .then(toFraction)
  }

  async getPriceOracle ({ token }) {
    return this
      ._callForToken('getPriceOracleForJS', token)
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

  _getTokenAddress (token) {
    return this._getTokenContract(token).address
  }

  async _callForToken (callMethod, token, ...args) {
    debug('Get %s for token %s', callMethod, token)
    const tokenAddress = this._getTokenAddress(token)

    return this._dx[callMethod]
      .call(tokenAddress, ...args)
  }

  async _callForPair (callMethod, sellToken, buyToken, ...args) {
    debug('Get %s for pair %s-%s', callMethod, sellToken, buyToken)
    const sellTokenAddress = this._getTokenAddress(sellToken)
    const buyTokenAddress = this._getTokenAddress(buyToken)

    return this._dx[callMethod]
      .call(sellTokenAddress, buyTokenAddress, ...args)
  }

  async _callForAuction (callMethod, sellToken, buyToken, auctionIndex, ...args) {
    debug('Get %s for auction %d of pair %s-%s',
      callMethod, auctionIndex, sellToken, buyToken
    )
    const sellTokenAddress = this._getTokenAddress(sellToken)
    const buyTokenAddress = this._getTokenAddress(buyToken)

    return this._dx[callMethod]
      .call(sellTokenAddress, buyTokenAddress, auctionIndex, ...args)
  }

  async _transactionForToken (transactionMethod, address, token, ...args) {
    debug('Execute transaction %s (address %s) for token %s',
      transactionMethod, address, token
    )
    const tokenAddress = this._getTokenAddress(token)

    const params = [
      tokenAddress,
      ...args
    ]
    return this._doTransaction(transactionMethod, address, params)
  }

  async _transactionForPair (
    transactionMethod, address, sellToken, buyToken, ...args
  ) {
    debug('Execute transaction %s (address %s) for pair %s-%s',
      transactionMethod, address, sellToken, buyToken
    )
    const sellTokenAddress = this._getTokenAddress(sellToken)
    const buyTokenAddress = this._getTokenAddress(buyToken)

    const params = [
      sellTokenAddress,
      buyTokenAddress,
      ...args
    ]
    return this._doTransaction(transactionMethod, address, params)
  }

  async _transactionForAuction (
    transactionMethod, address, sellToken, buyToken, auctionIndex, ...args
  ) {
    debug('Execute transaction %s (address %s) for auction %d of the pair %s-%s',
      transactionMethod, address, auctionIndex, sellToken, buyToken
    )
    const sellTokenAddress = this._getTokenAddress(sellToken)
    const buyTokenAddress = this._getTokenAddress(buyToken)
    const params = [
      sellTokenAddress,
      buyTokenAddress,
      auctionIndex,
      ...args
    ]
    return this._doTransaction(transactionMethod, address, params)
  }

  async _doTransaction (transactionMethod, address, params) {
    const estimatedGas =
      await this._dx[transactionMethod]
      .estimateGas(...params)

    return this._dx[transactionMethod](...params, {
      from: address,
      gas: estimatedGas
    })
  }

  async _loadContracts (contractNames, contractsBaseDir) {
    return this._ethereumClient.loadContracts({
      contractNames,
      contractsBaseDir
    })
  }

  async _loadTokensContracts (tokenSymbols, contractsBaseDir) {
    const contractNames = tokenSymbols.map(symbol => 'Token' + symbol)
    return this._loadContracts(contractNames, contractsBaseDir)
  }
}

function toFraction ([ numerator, denominator ]) {
  return { numerator, denominator }
}

function toTransactionNumber (transactionResult) {
  return transactionResult.tx
}

module.exports = AuctionRepoEthereum
