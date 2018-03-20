const BigNumber = require('bignumber.js')

const TIME_TO_REACH_MARKET_PRICE_MILLISECONNDS = 6 * 60 * 60 * 1000

const numberUtil = require('../../helpers/numberUtil')
const formatUtil = require('../../helpers/formatUtil')

module.exports = function ({ logger, sellToken, buyToken, now, marketDetails }) {
  const {
    isApprovedMarket,
    state,
    isSellTokenApproved,
    isBuyTokenApproved,
    auctionIndex,
    auctionStart,
    auction,
    auctionOpp
  } = marketDetails

  logger.info(`\tToken pair: ${sellToken}-${buyToken}`)
  logger.info('\n\tIs an approved market? %s', isApprovedMarket ? 'Yes' : 'No')
  logger.info(`\tState: ${state}`)

  logger.info(`\n\tAre tokens Approved?`)
  logger.info('\t\t- %s: %s', sellToken, formatUtil.formatBoolean(isSellTokenApproved))
  logger.info('\t\t- %s: %s', buyToken, formatUtil.formatBoolean(isBuyTokenApproved))

  logger.info('\n\tState info:')
  logger.info('\t\t- auctionIndex: %s', auctionIndex)
  logger.info('\t\t- auctionStart: %s', formatUtil.formatDateTime(auctionStart))

  if (auctionStart) {
    // debug('\t\t- Blockchain time: %s', formatUtil.formatDateTime(now))
    if (now < auctionStart) {
      logger.info('\t\t- It will start in: %s', formatUtil.formatDatesDifference(auctionStart, now))
    } else {
      logger.info('\t\t- It started: %s ago', formatUtil.formatDatesDifference(now, auctionStart))
      const marketPriceTime = new Date(
        auctionStart.getTime() +
        TIME_TO_REACH_MARKET_PRICE_MILLISECONNDS
      )

      // debug('\t\t- Market price time: %s', formatUtil.formatDateTime(marketPriceTime))
      if (marketPriceTime > now) {
        logger.info('\t\t- It will reached market price in: %s', formatUtil.formatDatesDifference(now, marketPriceTime))
      } else {
        logger.info('\t\t- It has reached market price: %s ago', formatUtil.formatDatesDifference(marketPriceTime, now))
      }
    }
  }

  if (auction) {
    _printAuctionDetails({
      auction,
      tokenA: sellToken,
      tokenB: buyToken,
      auctionIndex,
      state
    })
  }

  if (auction) {
    _printAuctionDetails({
      auction: auctionOpp,
      tokenA: buyToken,
      tokenB: sellToken,
      auctionIndex,
      state
    })
  }
}

function _printAuctionDetails({ auction, tokenA, tokenB, auctionIndex, state }) {
  /*
  logger.info(`\n\tAuction ${tokenA}-${tokenB}:`)

  // printProps('\t\t', auctionProps, auction, formatters)
  let closed
  if (auction.isClosed) {
    closed = 'Yes'
    if (auction.sellVolume.isZero()) {
      closed += ' (closed from start)'
    }
  } else if (auction.isTheoreticalClosed) {
    closed = 'Theoretically closed'
  } else {
    closed = 'No'
  }
  logger.info('\t\tIs closed: %s', closed)

  const fundingInUSD = await auctionRepo.getFundingInUSD({
    tokenA, tokenB, auctionIndex
  })

  logger.info('\t\tSell volume:')
  logger.info(`\t\t\tsellVolume: %d %s`, formatFromWei(auction.sellVolume), tokenA)
  logger.info(`\t\t\tsellVolume: %d USD`, fundingInUSD.fundingA)

  const price = await auctionRepo.getCurrentAuctionPrice({ sellToken: tokenA, buyToken: tokenB, auctionIndex })
  if (price) {
    let closingPrice
    if (auctionIndex > 1) {
      auctionIndex = await auctionRepo.getPastAuctionPrice({
        sellToken: tokenA,
        buyToken: tokenB,
        auctionIndex: auctionIndex - 1
      })
    } else {
      closingPrice = null
    }

    logger.info(`\t\tPrice:`)
    if (!closingPrice) {
      logger.info(`\t\t\tCurrent Price: %s %s/%s`, fractionFormatter(price),
        tokenB, tokenA)
    } else {
      let buyVolumesInSellTokens, priceRelationshipPercentage
      if (price.numerator.isZero()) {
        // The auction runned for too long
        buyVolumesInSellTokens = auction.sellVolume
        priceRelationshipPercentage = 'N/A'
      } else {
        // Get the number of sell tokens that we can get for the buyVolume
        buyVolumesInSellTokens = price.denominator.times(auction.buyVolume).div(price.numerator)
        priceRelationshipPercentage = price.numerator
          .mul(closingPrice.denominator)
          .div(price.denominator)
          .div(closingPrice.numerator)
          .mul(100)
          .toFixed(2) + ' %'
      }
      const boughtPercentage = 100 - 100 * (auction.sellVolume - buyVolumesInSellTokens) / auction.sellVolume
      // debug(`\t\tBuy volume (in sell tokens):`, formatFromWei(buyVolumesInSellTokens.toNumber()))

      logger.info(`\t\t\tPrevious Closing Price: %s %s/%s`, fractionFormatter(closingPrice),
        tokenB, tokenA)

      logger.info(`\t\t\tPrice relation: %s`, priceRelationshipPercentage)
      logger.info('\t\tBuy volume:')
      logger.info(`\t\t\tbuyVolume: %d %s`, formatFromWei(auction.buyVolume), tokenB)
      logger.info(`\t\t\tBought percentage: %s %`, boughtPercentage.toFixed(4))
    }
    if (state.indexOf('WAITING') === -1) {
      // Show outstanding volumen if we are not in a waiting period
      const outstandingVolume = await auctionRepo.getOutstandingVolume({
        sellToken: tokenA,
        buyToken: tokenB,
        auctionIndex
      })
      logger.info(`\t\t\tOutstanding volume: %d %s`,
        formatFromWei(outstandingVolume), tokenB)
    }
  }
  */
}
