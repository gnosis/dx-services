const TIME_TO_REACH_MARKET_PRICE_MILLISECONNDS = 6 * 60 * 60 * 1000

// const numberUtil = require('../../helpers/numberUtil')
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
      state,
      logger
    })
  }

  if (auction) {
    _printAuctionDetails({
      auction: auctionOpp,
      tokenA: buyToken,
      tokenB: sellToken,
      auctionIndex,
      state,
      logger
    })
  }
}

function _printAuctionDetails ({ auction, tokenA, tokenB, auctionIndex, state, logger }) {
  const {
    isClosed,
    price,
    closingPrice,
    isTheoreticalClosed,
    sellVolume,
    buyVolume,
    // buyVolumesInSellTokens,
    priceRelationshipPercentage,
    boughtPercentage,
    outstandingVolume
  } = auction

  logger.info(`\n\tAuction ${tokenA}-${tokenB}:`)
  
  // printProps('\t\t', auctionProps, auction, formatters)
  let closedStatus
  if (isClosed) {
    closedStatus = 'Yes'
    if (sellVolume.isZero()) {
      closedStatus += ' (closed from start)'
    }
  } else if (isTheoreticalClosed) {
    closedStatus = 'Theoretically closed'
  } else {
    closedStatus = 'No'
  }

  logger.info('\t\tIs closed: %s', closedStatus)

  if (!sellVolume.isZero()) {
    logger.info('\t\tSell volume:')
    logger.info(`\t\t\tsellVolume: %d %s`, formatUtil.formatFromWei(sellVolume), tokenA)
    if (auction.fundingInUSD) {
      logger.info(`\t\t\tsellVolume: %d USD`, auction.fundingInUSD)
    }
    
    if (price) {
      logger.info(`\t\tPrice:`)
      logger.info(
        `\t\t\tCurrent Price: %s %s/%s`,
        formatUtil.formatFraction(price), tokenB, tokenA
      )
      if (closingPrice) {
        logger.info(`\t\t\tClosing Price: %s %s/%s`,
          formatUtil.formatFraction(closingPrice), tokenB, tokenA
        )
  
        logger.info(`\t\t\tPrice relation: %s`,
          priceRelationshipPercentage ? priceRelationshipPercentage.toFixed(2) + '%' : 'N/A'
        )
      }
    }
  } else {
    logger.info('\t\tSell volume: 0')
  }


  if (!sellVolume.isZero()) {
    logger.info('\t\tBuy volume:')
    logger.info(`\t\t\tbuyVolume: %d %s`, formatUtil.formatFromWei(buyVolume), tokenB)
    logger.info(`\t\t\tBought percentage: %s %`, boughtPercentage.toFixed(4))

    const isNotInWaitingPeriod = (state.indexOf('WAITING') === -1)
    if (isNotInWaitingPeriod) {
      logger.info(`\t\t\tOutstanding volume: %d %s`,
        formatUtil.formatFromWei(outstandingVolume), tokenB)
    }
  }
}
