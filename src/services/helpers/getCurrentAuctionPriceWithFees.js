const assert = require('assert')
const { ZERO } = require('../../helpers/numberUtil')

const getOutstandingVolume = require('./getOutstandingVolume')

async function getCurrentAuctionPriceWithFees ({
  auctionRepo,
  ethereumRepo,
  sellToken,
  buyToken,
  auctionIndex,
  amount,
  from,
  owlAllowance,
  owlBalance,
  ethUSDPrice,
  assertState,
  cacheTimeShort,
  cacheTimeAverage
}) {
  // 10^30 * 10^37 = 10^67
  const outstandingVolume = await getOutstandingVolume({
    auctionRepo,
    ethereumRepo,
    sellToken,
    buyToken,
    auctionIndex,
    assertState,
    cacheTimeShort,
    cacheTimeAverage
  })

  let amountAfterFee = amount
  let closesAuction = false
  if (amount.lt(outstandingVolume)) {
    if (amount.gt(ZERO)) {
      amountAfterFee = await auctionRepo.settleFee(buyToken, sellToken, auctionIndex, amount, from, owlAllowance, owlBalance, ethUSDPrice)
    }
  } else {
    amountAfterFee = outstandingVolume
    closesAuction = true
  }

  return {
    closesAuction,
    amountAfterFee
  }
}

module.exports = getCurrentAuctionPriceWithFees
