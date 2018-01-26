const debug = require('debug')('dx-service:repositories:AuctionRepoEthereum')
/*
  There was also some elements not used:
      * props
          * claimedAmounts
      * methods:
          * addTokenPair, addTokenPair2
      * events:
          NewDeposit
          NewWithdrawal
          NewSellOrder
          NewBuyOrder
          NewSellerFundsClaim
          NewBuyerFundsClaim
          NewTokenPair
          AuctionCleared
          Log
          LogOustandingVolume
          LogNumber
          ClaimBuyerFunds
      * getBasicInfo:
          * could be other info if it's interesting like ethAddress,
            ethOracleAddress, some config minimus (maybe the USD
            minimun could be gotten from here so it's more dynamic
  TODO: Understand:
    * what is extraTokens
*/

const contractNames = [
  'DutchExchange',
  'PriceOracleInterface'
]

const tokens = {
  'TokenGNO': 'GNO',
  'TokenOWL': 'OWL',
  'TokenTUL': 'TUL',
  'EtherToken': 'ETH'
}

class AuctionRepoEthereum {
  constructor ({ ethereumClient }) {
    this._ethereumClient = ethereumClient

    // Load contracts
    this.ready = this._loadContracts()
      .then(() => {
        // keep an alias for the DX contract
        this._dx = this._contracts.DutchExchange
      })
  }

  async getBasicInfo () {
    debug('Get auction basic info')
    return this._dx
      .owner.call()
      .then(ownerAddress => {
        return {
          network: this._ethereumClient.getUrl(),
          ownerAddress: ownerAddress,
          exchageAddress: this._dx.address,
          blockNumber: this._ethereumClient.getBlockNumber()
        }
      })
  }

  async getBalance ({ token, address }) {
    const tokenContract = this._getTokenContract(token)
    if (!tokenContract) {
      const knownTokens = Object.keys(this._tokens)
      throw new Error(`Unknown token ${token}. Known tokens are ${knownTokens}`)
    }

    debug(
      'Get balance of the account %s for token %s (%s)',
      address, token, tokenContract.address
    )

    return this._dx.balances.call(tokenContract.address, address)
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

  async getPriceOracle ({ token }) {
    const tokenContract = this._getTokenContract(token)
    return this._dx
      .getPriceOracleForJS
      .call(tokenContract.address)
      .then(priceTuple => ({
        numerator: priceTuple[0],
        denominator: priceTuple[1]
      }))
  }

  _getTokenContract (token) {
    const tokenContract = this._tokens[token]
    if (!tokenContract) {
      const knownTokens = Object.keys(this._tokens)
      throw new Error(`Unknown token ${token}. Known tokens are ${knownTokens}`)
    }
    return tokenContract
  }

  async _loadContracts () {
    // Load main contracts (initialize this._contracts)
    const loadMainContracts = this._ethereumClient.loadContracts({
      contractNames
    }).then(contracts => {
      // save contracts internally
      this._contracts = contracts
    })

    // Load token contracts (initialize this._tokens)
    const tokenContractNames = Object.keys(tokens)
    const loadTokenContracts = this._ethereumClient.loadContracts({
      contractNames: tokenContractNames
    }).then(tokenContracts => {
      // save mapping (symbol => token_contract)
      this._tokens = tokenContractNames
        .reduce((tokensAccumulator, tokenContractName) => {
          const symbol = tokens[tokenContractName]
          tokensAccumulator[symbol] = tokenContracts[tokenContractName]
          return tokensAccumulator
        }, {})
    })

    return Promise.all([loadMainContracts, loadTokenContracts])
  }

  /*
  async getCurrentAuctionIndex ({ sellToken, buyToken }) {
    debug('Get current auction index for %s-%s', sellToken, buyToken)

    // latestAuctionIndices
    return this._getAuction({ sellToken, buyToken }).index
  }

  async gerAuctionStart ({ sellToken, buyToken }) {
    debug('Get auction start for %s-%s', sellToken, buyToken)
    // auctionStarts
    return this._getAuction({ sellToken, buyToken }).auctionStart
  }

  async getClosingPrice ({ sellToken, buyToken, auctionIndex }) {
    debug('Get sell volume for %s-%s', sellToken, buyToken)
    return this._getAuction({ sellToken, buyToken }).closingPrice
  }

  async gerSellVolume ({ sellToken, buyToken }) {
    debug('Get sell volume for %s-%s', sellToken, buyToken)
    // sellVolumesCurrent
    return this._getAuction({ sellToken, buyToken }).sellVolume
  }

  async gerSellVolumeNext ({ sellToken, buyToken }) {
    debug('Get sell volume next for %s-%s', sellToken, buyToken)
    // sellVolumesNext
    return this._getAuction({ sellToken, buyToken }).sellVolumeNext
  }

  async gerBuyVolume ({ sellToken, buyToken }) {
    debug('Get buy volume for %s-%s', sellToken, buyToken)
    return this._getAuction({ sellToken, buyToken }).buyVolume
  }

  async getSellerBalance ({ sellToken, buyToken, address }) {
    debug('Get seller (%s) balance for %s-%s', address, sellToken, buyToken)
    // sellerBalances
    this._notImplementedYet()
  }

  async getBuyerBalance ({ sellToken, buyToken, address }) {
    debug('Get buyer (%s) balance for %s-%s', address, sellToken, buyToken)
    this._notImplementedYet()
  }

  async deposit ({ token, amount }) {
    debug('Deposit %d %s', token, amount)
    this._notImplementedYet()
  }

  async withdraw ({ token, amount }) {
    debug('Withdraw %d %s', token, amount)
    this._notImplementedYet()
  }

  async sell ({ sellToken, buyToken, auctionIndex, amount }) {
    debug(
      'Sell %d %s using %s for auction %d',
      amount, buyToken,
      sellToken,
      auctionIndex
    )
    // postSellOrder
    //this._notImplementedYet()
    return amount
  }

  async buy ({ sellToken, buyToken, auctionIndex, amount }) {
    debug(
      'Buy %d %s using %s for auction %d',
      amount, buyToken,
      sellToken,
      auctionIndex
    )
    // postBuyOrder
    this._notImplementedYet()
  }

  async claimSellerFunds ({ sellToken, buyToken, address, auctionIndex }) {
    debug('Claim seller (%s) funds for auction %s-%s (%d)',
      address, sellToken, buyToken, auctionIndex)
    // claimSellerFunds
    this._notImplementedYet()
  }

  async claimBuyerFunds ({ sellToken, buyToken, address, auctionIndex }) {
    debug('Claim buyer (%s) funds for auction %s-%s (%d)',
      address, sellToken, buyToken, auctionIndex)
    // claimBuyerFunds
    this._notImplementedYet()
  }

  async getUnclaimedBuyerFunds ({ sellToken, buyToken, address, auctionIndex }) {
    debug('Get unclaimed buyer (%s) funds for auction %s-%s (%d)',
      address, sellToken, buyToken, auctionIndex)
    // getUnclaimedBuyerFunds
    this._notImplementedYet()
  }

  async getPrice ({ sellToken, buyToken, auctionIndex }) {
    debug('Get price for auction %d', auctionIndex)
    // TODO: IMPORTANT: This calculated for the onGoing (check SC)
    // getPrice
    // TODO: what is the getPriceForJS??
    this._notImplementedYet()
  }

  _notImplementedYet () {
    throw new Error('Not implemented yet!')
  }
  */
}

module.exports = AuctionRepoEthereum
