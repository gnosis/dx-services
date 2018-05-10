const cliUtils = require('../helpers/cliUtils')

function registerCommand ({ cli, instances, logger }) {
  cli.command('closing-prices <token-pair> [count]', 'Get the closing prices for a given pair (i.e. WETH-RDN)', yargs => {
    cliUtils.addPositionalByName('token-pair', yargs)
    cliUtils.addPositionalByName('count', yargs)
  }, async function (argv) {
    const { tokenPair: tokenPairString, count } = argv
    const [ sellToken, buyToken ] = tokenPairString.split('-')
    const {
      dxInfoService
    } = instances

    // Get data
    logger.info('Get last %d closing prices for %s:', count, tokenPairString)
    const lastClosingPrices = await dxInfoService.getLastClosingPrices({
      sellToken,
      buyToken,
      count
    })

    if (lastClosingPrices.length) {
      logger.info('Found %d closing prices:', lastClosingPrices.length)
      lastClosingPrices.forEach(({ auctionIndex, price, priceIncrement }, i) => {
        let priceIncrementStr
        if (priceIncrement) {
          if (priceIncrement.greaterThan(0)) {
            const value = priceIncrement.toFixed(2)
            priceIncrementStr = `: +${value}%`
          } else {
            const value = priceIncrement.toFixed(2)
            priceIncrementStr = `: ${value}%`
          }
        } else {
          priceIncrementStr = ''
        }
  
        logger.info(
          '\t%d. %s%s',
          auctionIndex,
          price,
          priceIncrementStr
        )
      })
    } else {
      logger.info('No closing prices were found')
    }
  })
}

module.exports = registerCommand
