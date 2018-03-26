const getAuctionsBalances = require('./getAuctionsBalances')

async function getClaimableTokens ({ auctionRepo, tokenA, tokenB, address, count }) {
  const auctionsBalances = await getAuctionsBalances({
    auctionRepo,
    tokenA,
    tokenB,
    address,
    count
  })

  return auctionsBalances.reduce((acc, auctionsBalance) => {
    const {
      sellerBalanceA,
      buyerBalanceA,
      sellerBalanceB,
      buyerBalanceB,
      auctionIndex
    } = auctionsBalance

    // Seller
    _pushNewClaimIfRequired(sellerBalanceA, tokenA, tokenB, auctionIndex, acc.sellerClaims)
    _pushNewClaimIfRequired(sellerBalanceB, tokenB, tokenA, auctionIndex, acc.sellerClaims)

    // Buyer
    _pushNewClaimIfRequired(buyerBalanceA, tokenA, tokenB, auctionIndex, acc.buyerClaims)
    _pushNewClaimIfRequired(buyerBalanceB, tokenB, tokenA, auctionIndex, acc.buyerClaims)

    return acc
  }, {
    sellerClaims: [],
    buyerClaims: []
  })
}

function _pushNewClaimIfRequired (amount, sellToken, buyToken, auctionIndex, claimsArray) {
  if (amount.greaterThan(0)) {
    claimsArray.sellerClaims.push({
      sellToken,
      buyToken,
      auctionIndex,
      amount
    })
  }
}

module.exports = getClaimableTokens
