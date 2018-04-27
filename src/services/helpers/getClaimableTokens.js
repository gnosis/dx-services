const loggerNamespace = 'dx-service:services:helpers:getClaimableTokens'
const Logger = require('../../helpers/Logger')
const logger = new Logger(loggerNamespace)

const getAuctionsBalances = require('./getAuctionsBalances')

async function getClaimableTokens ({ auctionRepo, tokenA, tokenB, address, count }) {
  const auctionsBalances = await getAuctionsBalances({
    auctionRepo,
    tokenA,
    tokenB,
    address,
    count
  })
  // TODO use new functions to get seller/buyerClaims
  // const sellerClaims = await auctionRepo.getIndicesWithClaimableTokensForSellers({
  //   sellToken: tokenA, buyToken: tokenB, address, lastNAuctions: count
  // })
  //
  // const buyerClaims = await auctionRepo.getIndicesWithClaimableTokensForBuyers({
  //   sellToken: tokenA, buyToken: tokenB, address, lastNAuctions: count
  // })
  //
  // // logger.info('%o', sellerClaims)
  // return {
  //   sellerClaims,
  //   buyerClaims
  // }

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
    claimsArray.push({
      sellToken,
      buyToken,
      auctionIndex,
      amount
    })
  }
}

module.exports = getClaimableTokens
