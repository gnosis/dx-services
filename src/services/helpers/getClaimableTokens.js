async function getClaimableTokens ({ auctionRepo, tokenA, tokenB, address, lastNAuctions }) {
  const [
    sellerClaims,
    buyerClaims
  ] = await Promise.all([
    auctionRepo.getIndicesWithClaimableTokensForSellers({
      sellToken: tokenA, buyToken: tokenB, address, lastNAuctions }),

    auctionRepo.getIndicesWithClaimableTokensForBuyers({
      sellToken: tokenA, buyToken: tokenB, address, lastNAuctions })
  ])

  return {
    sellerClaims,
    buyerClaims
  }
}

module.exports = getClaimableTokens
