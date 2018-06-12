async function getClaimableTokens ({ auctionRepo, tokenA, tokenB, address, lastNAuctions }) {
  let [
    sellerClaims,
    buyerClaims
  ] = await Promise.all([
    auctionRepo.getIndicesWithClaimableTokensForSellers({
      sellToken: tokenA, buyToken: tokenB, address, lastNAuctions }),

    auctionRepo.getIndicesWithClaimableTokensForBuyers({
      sellToken: tokenA, buyToken: tokenB, address, lastNAuctions })
  ])

  const marketDetails = await auctionRepo.getStateInfo({
    sellToken: tokenA, buyToken: tokenB })

  const [ sellerClaimsIndex, sellerClaimsAmounts ] = sellerClaims
  sellerClaims = sellerClaimsIndex.reduce((acc, auctionIndex, currentIndex) => {
    if (marketDetails.auction.isClosed ||
      !auctionIndex.eq(marketDetails.auctionIndex)) {
      acc.push({
        auctionIndex,
        amount: sellerClaimsAmounts[currentIndex]
      })
    }
    return acc
  }, [])

  const [ buyerClaimsIndex, buyerClaimsAmounts ] = buyerClaims
  buyerClaims = buyerClaimsIndex.reduce((acc, auctionIndex, currentIndex) => {
    if (marketDetails.auction.isClosed ||
      !auctionIndex.eq(marketDetails.auctionIndex)) {
      acc.push({
        auctionIndex,
        amount: buyerClaimsAmounts[currentIndex]
      })
    }
    return acc
  }, [])

  return {
    sellerClaims,
    buyerClaims
  }
}

module.exports = getClaimableTokens
