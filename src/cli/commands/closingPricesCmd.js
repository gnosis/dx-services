const formatUtil = require('../../helpers/formatUtil')
const numberUtil = require('../../helpers/numberUtil')

function registerCommand ({ cli, instances, logger }) {
  cli.command('closing-prices <token-pair> [count]', 'Get the closing prices for a given pair (i.e. ETH-RDN)', yargs => {
    yargs.positional('token-pair', {
      type: 'string',
      default: 'ETH-RDN',
      describe: 'The token pair of the auction'
    })
    yargs.positional('count', {
      type: 'number',
      default: 5,
      describe: 'The token pair of the auction'
    })
  }, async function (argv) {
    const { tokenPair: tokenPairString, count } = argv
    const [ sellToken, buyToken ] = tokenPairString.split('-')
    const {
      dxInfoService
    } = instances

    // Get data
    const lastClosingPrices = await dxInfoService.getLastClosingPrices({
      sellToken,
      buyToken,
      count
    })

    logger.info('Showing last %d closing prices:', count)
    lastClosingPrices.forEach(({ auctionIndex, price, percentage }, i) => {
      let percentageMessage
      if (percentage) {
        if (percentage.greaterThan(100)) {
          const value = percentage.toFixed(2)
          percentageMessage = `(+${value})`
        } else {
          const value = percentage.minus(100).toFixed(2)
          percentageMessage = `(${value})`
        }
      } else {
        percentageMessage = ''
      }

      logger.info(
        '\t%d. %d%s',
        auctionIndex,
        formatUtil.formatFraction(price),
        percentageMessage
      )
    })
  })
}

module.exports = registerCommand
