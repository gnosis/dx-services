async function getClaimableTokens ({ auctionRepo, tokenA, tokenB, address, count }) {
  const sellerClaims = await auctionRepo.getIndicesWithClaimableTokensForSellers({
    sellToken: tokenA, buyToken: tokenB, address, lastNAuctions: count
  })

  const buyerClaims = await auctionRepo.getIndicesWithClaimableTokensForBuyers({
    sellToken: tokenA, buyToken: tokenB, address, lastNAuctions: count
  })

  return {
    sellerClaims,
    buyerClaims
  }
}

module.exports = getClaimableTokens
