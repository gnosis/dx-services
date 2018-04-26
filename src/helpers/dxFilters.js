function createAuctionFilter ({
  sellToken,
  buyToken,
  auctionIndex,
  auctionIndexParam = 'auctionIndex',
  sellTokenParam = 'sellToken',
  buyTokenParam = 'buyToken'
}) {
  return item => {
    return item[auctionIndexParam].equals(auctionIndex) &&
      item[sellTokenParam] === sellToken &&
      item[buyTokenParam] === buyToken
  }
}

function createTokenPairFilter ({
  sellToken,
  buyToken,
  auctionIndex,
  sellTokenParam = 'sellToken',
  buyTokenParam = 'buyToken'
}) {
  return item => {
    return item[sellTokenParam] === sellToken &&
      item[buyTokenParam] === buyToken
  }
}

module.exports = {
  createAuctionFilter,
  createTokenPairFilter
}
