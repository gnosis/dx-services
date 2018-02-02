const debug = require('debug')('dx-service:repositories:AuctionRepoMock')
const auctions = {
  'RDN-ETH': {
    // Aprox 0.004079 ETH/RDN
    index: 77,
    auctionStart: new Date(),
    // https://walletinvestor.com/converter/usd/raiden-network-token/315
    sellVolume: 76.547844,      // RDN. aprox $315
    sellVolumeNext: 12.547844,  // RDN
    buyVolume: 0                // ETH
  },
  'ETH-RDN': {
    index: 77,
    auctionStart: new Date(),
    // https://walletinvestor.com/converter/usd/ethereum/290
    sellVolume: 0.289432,       // ETH. aprox $290
    sellVolumeNext: 12.547844,  // ETH
    buyVolume: 0                // RDN
  }
}

const balances = {
  'RDN': {
    '0x424a46612794dbb8000194937834250Dc723fFa5': 267.345, // Anxo
    '0x8c3fab73727E370C1f319Bc7fE5E25fD9BEa991e': 15.20,   // Pepe
    '0x627306090abaB3A6e1400e9345bC60c78a8BEf57': 500.0,   // Ganache
    '0xAe6eCb2A4CdB1231B594cb66C2dA9277551f9ea7': 301.112  // Dani
  },
  'ETH': {
    '0x424a46612794dbb8000194937834250Dc723fFa5': 1.44716, // Anxo
    '0x8c3fab73727E370C1f319Bc7fE5E25fD9BEa991e': 0.23154, // Pepe
    '0x627306090abaB3A6e1400e9345bC60c78a8BEf57': 1.88130, // Ganache
    '0xAe6eCb2A4CdB1231B594cb66C2dA9277551f9ea7': 2.01234  // Dani
  }
}

class AuctionRepoMock {
  async getBasicInfo () {
    debug('Get auction basic info')
    return {
      network: 'http://localhost:8545',
      ownerAddress: '0x424a46612794dbb8000194937834250Dc723fFa5',
      exchageAddress: '0x1223'
    }
  }
  async getCurrentAuctionIndex ({ sellToken, buyToken }) {
    debug('Get current auction index for %s-%s', sellToken, buyToken)

    // latestAuctionIndices
    return this._getAuction({ sellToken, buyToken }).index
  }

  async getAuctionStart ({ sellToken, buyToken }) {
    debug('Get auction start for %s-%s', sellToken, buyToken)
    // auctionStarts
    return this._getAuction({ sellToken, buyToken }).auctionStart
  }

  async getClosingPrice ({ sellToken, buyToken, auctionIndex }) {
    debug('Get sell volume for %s-%s', sellToken, buyToken)
    return this._getAuction({ sellToken, buyToken }).closingPrice
  }

  async getSellVolume ({ sellToken, buyToken }) {
    debug('Get sell volume for %s-%s', sellToken, buyToken)
    // sellVolumesCurrent
    return this._getAuction({ sellToken, buyToken }).sellVolume
  }

  async getSellVolumeNext ({ sellToken, buyToken }) {
    debug('Get sell volume next for %s-%s', sellToken, buyToken)
    // sellVolumesNext
    return this._getAuction({ sellToken, buyToken }).sellVolumeNext
  }

  async getBuyVolume ({ sellToken, buyToken }) {
    debug('Get buy volume for %s-%s', sellToken, buyToken)
    return this._getAuction({ sellToken, buyToken }).buyVolume
  }

  async getBalance ({ token, address }) {
    debug('Get balance of %s for %s', token, address)
    // balances
    return balances[token][address]
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

  _getAuction ({ sellToken, buyToken }) {
    return auctions[sellToken + '-' + buyToken]
  }
}

module.exports = AuctionRepoMock
