const debug = require('debug')('dx-service:repositories:AuctionRepoMock')
// RDN/ETH: 0.004079
//  So 1 ETH = 243.891605 RDN
//
// See contract functions in:
//  https://docs.google.com/spreadsheets/d/1H-NXEvuxGKFW8azXtyQC26WQQuI5jmSxR7zK9tHDqSs/edit#gid=682667981
const auctions = {
  'RDN-ETH': {
    index: 77,
    auctionStart: new Date(),
    // https://walletinvestor.com/converter/usd/raiden-network-token/315
    sellVolume: 76.547844,  // RDN. aprox $315
    buyVolume: 0            // ETH
  },
  'ETH-RDN': {
    index: 77,
    auctionStart: new Date(),
    // https://walletinvestor.com/converter/usd/ethereum/290
    sellVolume: 0.289432,  // ETH. aprox $290
    buyVolume: 0           // RDN
  }
}

class AuctionRepoMock {
  async getCurrentAuctionIndex ({ sellToken, buyToken }) {
    debug('Get current auction index for %s-%s', sellToken, buyToken)
    return this._getAuction({ sellToken, buyToken }).index
  }

  async gerSellVolume ({ sellToken, buyToken }) {
    debug('Get sell volume for %s-%s', sellToken, buyToken)
    return this._getAuction({ sellToken, buyToken }).sellVolume
  }

  async gerAuctionStart ({ sellToken, buyToken }) {
    debug('Get auction start for %s-%s', sellToken, buyToken)
    return this._getAuction({ sellToken, buyToken }).auctionStart
  }

  async gerSellVolumeNext ({ sellToken, buyToken }) {
    debug('Get sell volume next for %s-%s', sellToken, buyToken)
    return this._getAuction({ sellToken, buyToken }).sellVolume
  }

  async getTulTokens ({ sellToken, buyToken }) {
    debug('Get tul for %s-%s', sellToken, buyToken)
    return this._getAuction({ sellToken, buyToken }).tulTokens
  }

  async getClosingPrice ({ sellToken, buyToken, auctionIndex }) {
    debug('Get sell volume for %s-%s', sellToken, buyToken)
    return this._getAuction({ sellToken, buyToken }).closingPrice
  }

  async gerBuyVolume ({ sellToken, buyToken }) {
    debug('Get buy volume for %s-%s', sellToken, buyToken)
    return this._getAuction({ sellToken, buyToken }).buyVolume
  }

  async getSellerBalance ({ sellToken, buyToken, address }) {
    debug('Get seller (%s) balance for %s-%s', address, sellToken, buyToken)
    return -1
  }

  async getBuyerBalance ({ sellToken, buyToken, address }) {
    debug('Get buyer (%s) balance for %s-%s', address, sellToken, buyToken)
    return -1
  }

  async getBuyerClaimedTokens ({ sellToken, buyToken, address }) {
    debug('Get buyer (%s) clamed tokens for %s-%s', address, sellToken, buyToken)
    return -1
  }

  async buy ({ sellToken, buyToken, amount, auctionIndex }) {
    debug(
      'Buy %d %s using %s for auction %d',
      amount,
      buyToken,
      sellToken,
      auctionIndex
    )
    // TODO: postBuyOrder(amount)
  }

  async buyAndClaim ({ sellToken, buyToken, amount, auctionIndex }) {
    debug(
      'Buy and claim %d %s using %s for auction %d',
      amount,
      buyToken,
      sellToken,
      auctionIndex
    )
    // TODO: postBuyOrder(amount)
  }

  async sell ({ sellToken, buyToken, amount }) {
    debug('Sell %d %s to get %s', amount, sellToken, buyToken)
    // TODO: postSellOrder(amount, index)
  }

  async claimSellerFunds ({ auctionIndex }) {
    debug('Claim sellet funds for auction %d', auctionIndex)
    // TODO: claimSellerFunds(auctionIndex)
  }

  async claimBuyerFunds ({ auctionIndex }) {
    debug('Claim buyer funds for auction %d', auctionIndex)
    // TODO: claimBuyerFunds(auctionIndex)
  }

  async getPrice ({ auctionIndex }) {
    debug('Get price for auction %d', auctionIndex)
    // TODO: IMPORTANT: This calculated for the onGoing (check SC)
    // TODO: getPrice(auctionIndex)
  }

  _getAuction ({ sellToken, buyToken }) {
    return auctions[sellToken + '-' + buyToken]
  }
}

/*
Events:
  NewSellOrder
  NewBuyOrder
  NewSellerFundsClaim
  NewBuyerFundsClaim
  AuctionCleared
*/

module.exports = AuctionRepoMock
