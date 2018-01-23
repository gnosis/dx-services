const debug = require('debug')('dx-service:repositories:auction')
// RDN/ETH: 0.004079
//  So 1 ETH = 243.891605 RDN
//  https://walletinvestor.com/converter/usd/ethereum/290
const auction = {
  index: 77,
  auctionStart: new Date(),
  sellVolume: 81.255153,  // RDN. aprox $315
  buyVolume: 0.304494,    // ETH. Aprox $290
  tulTokens: 120,         // TUL. $120 in fees
  closingPrice: 0.0041    // RDN/ETH // TODO: I think it's modeled as fraction.
}

class AuctionRepoMock {
  async getCurrentAuctionIndex () {
    debug('Get current auction index')
    return auction.index
  }

  async gerSellVolume () {
    debug('Get sell volume')
    return auction.sellVolume
  }

  async gerAuctionStart () {
    debug('Get auction start')
    return auction.auctionStart
  }

  async gerSellVolumeNext () {
    debug('Get sell volume next')
    return auction.sellVolume
  }

  async getTulTokens () {
    debug('Get tul')
    return auction.tulTokens
  }

  async getClosingPrice (auctionIndex) {
    debug('Get sell volume')
    return auction.closingPrice
  }

  async gerBuyVolume () {
    debug('Get sell volume')
    return auction.buyVolume
  }

  async getSellerBalance ({ buyToken, sellToken, address }) {
    debug('Get seller (%s) balance', address)
    return -1
  }

  async getBuyerBalance ({ buyToken, sellToken, address }) {
    debug('Get buyer (%s) balance', address)
    return -1
  }

  async getBuyerClaimedTokens ({ buyToken, sellToken, address }) {
    debug('Get buyer (%s) clamed tokens', address)
    return -1
  }

  async buy ({ buyToken, sellToken, amount, auctionIndex }) {
    debug(
      'Buy %d %s using %s for auction %d',
      amount,
      buyToken,
      sellToken,
      auctionIndex
    )
    // TODO: postBuyOrder(amount)
  }

  async buyAndClaim ({ buyToken, sellToken, amount, auctionIndex }) {
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
