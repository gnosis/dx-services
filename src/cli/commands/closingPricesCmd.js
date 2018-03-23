const formatUtil = require('../../helpers/formatUtil')
const numberUtil = require('../../helpers/numberUtil')

function registerCommand ({ cli, instances, logger }) {
  cli.command('closing-prices <token-pair>', 'Get the closing prices for a given pair (i.e. ETH-RDN)', yargs => {
    yargs.positional('token-pair', {
      type: 'string',
      default: 'ETH-RDN',
      describe: 'The token pair of the auction'
    })
  }, async function (argv) {
    const { tokenPair: tokenPairString } = argv
    const [ sellToken, buyToken ] = tokenPairString.split('-')
    const {
      dxInfoService
    } = instances

    // Get data
    const auctionIndex = await dxInfoService.getAuctionIndex({ sellToken, buyToken })
    const closingPricesPromises = []
    for (var i = 0; i < auctionIndex; i++) {
      const auctionIndexAux = i
      const closingPricePromise = dxInfoService
        .getClosingPrice({
          sellToken,
          buyToken,
          auctionIndex: auctionIndexAux
        })
        .then(price => ({
          price,
          auctionIndex: auctionIndexAux
        }))

      closingPricesPromises.push(closingPricePromise)
    }

    logger.info('Closing prices:')
    const closingPrices = await Promise.all(closingPricesPromises)
    closingPrices.forEach((closingPrice, i) => {
      let percentageMessage
      if (i > 0) {
        let previousClosingPrice = numberUtil
          .toBigNumberFraction(closingPrices[i - 1].price, true)
        let currentClosingPrice = numberUtil
          .toBigNumberFraction(closingPrice.price, true)

        if (!currentClosingPrice.isZero() && !previousClosingPrice.isZero()) {
          let percentage = numberUtil.ONE.plus(
            currentClosingPrice
              .minus(previousClosingPrice)
              .div(previousClosingPrice)
          ).mul(100)

          percentageMessage = ' (' +
            ((percentage.greaterThan(100)) ? '+' + percentage.toFixed(2) : percentage.minus(100).toFixed(2)) +
            ')'
        } else {
          percentageMessage = ''
        }
      } else {
        percentageMessage = ''
      }

      logger.info(
        '\t%d. %d%s',
        closingPrice.auctionIndex,
        formatUtil.formatFraction(closingPrice.price),
        percentageMessage
      )
    })
  })
}

module.exports = registerCommand
