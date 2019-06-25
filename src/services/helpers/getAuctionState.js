const assert = require('assert')
const { ZERO } = require('../../helpers/numberUtil')

const getOutstandingVolume = require('./getOutstandingVolume')

async function getAuctionState ({
  auctionRepo,
  ethereumRepo,
  sellToken,
  buyToken,
  auctionIndex
}) {
  assertAuction(sellToken, buyToken, auctionIndex)

  const [
    buyVolume,
    sellVolume,
    price
  ] = await Promise.all([
    auctionRepo.getBuyVolume({ sellToken, buyToken }),
    auctionRepo.getSellVolume({ sellToken, buyToken }),
    auctionRepo.getCurrentAuctionPrice({ sellToken, buyToken, auctionIndex })
  ])

  let isTheoreticalClosed = null

  const [auctionStart, now] = await Promise.all([
    auctionRepo.getAuctionStart({ sellToken, buyToken }),
    auctionRepo._getTime()
  ])
  const hasAuctionStarted = auctionStart && auctionStart < now

  if (price && hasAuctionStarted) {
    /*
    auctionLogger.debug(sellToken, buyToken, 'Auction index: %d, Price: %d/%d %s/%s',
      auctionIndex, price.numerator, price.denominator,
      sellToken, buyToken
    )
    */

    // (Pn x SV) / (Pd x BV)
    // example:
    // isTheoreticalClosed = price.numerator
    //   .mul(sellVolume)
    //   .sub(price.denominator
    //     .mul(buyVolume)
    //   ).toNumber() === 0

    const outstandingVolume = await getOutstandingVolume({
      auctionRepo,
      ethereumRepo,
      sellToken,
      buyToken,
      auctionIndex
    })

    isTheoreticalClosed = outstandingVolume.eq(ZERO)
  } else {
    isTheoreticalClosed = false
  }

  const closingPrice = await auctionRepo.getClosingPrices({
    sellToken, buyToken, auctionIndex
  })

  // There's to ways a auction can be closed
  //  (1) Because it has cleared, so it has a closing price
  //  (2) Because when the auction started, it didn't have sellVolume, so i
  //      is considered, autoclosed since the start
  let isClosed
  if (sellVolume.isZero()) {
    // closed if sellVolume=0 and the auction has started and hasn't been cleared
    isClosed = hasAuctionStarted
  } else {
    /*
    debug('_getIsClosedState(%s-%s): Closing price: %d/%d',
      sellToken, buyToken,
      closingPrice.numerator, closingPrice.denominator
    )
    */
    isClosed = closingPrice !== null
  }

  /*
  debug('_getIsClosedState(%s-%s): is closed? %s. Is theoretical closed? %s',
    sellToken, buyToken,
    isClosed, isTheoreticalClosed
  )
  */

  return {
    buyVolume,
    sellVolume,
    auctionStart,
    hasAuctionStarted,
    closingPrice,
    isClosed,
    isTheoreticalClosed
  }
}

function assertPair (sellToken, buyToken) {
  assert(sellToken, 'The sell token is required')
  assert(buyToken, 'The buy token is required')
}

function assertAuction (sellToken, buyToken, auctionIndex) {
  assertPair(sellToken, buyToken)
  assert(auctionIndex >= 0, 'The auction index is invalid')
}

module.exports = getAuctionState
