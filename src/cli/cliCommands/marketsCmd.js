const cliUtils = require('../helpers/cliUtils')

function registerCommand ({ cli, instances, logger }) {
  cli.command(
    'markets [count]',
    'Return the list of avaliable token pairs',
    yargs => {
      cliUtils.addPositionalByName('count', yargs)
    }, async function (argv) {
      const { count } = argv
      const {
        dxInfoService
      } = instances

      // Get auction index
      // TODO: Use pagination, fetch in blocks
      // TODO: Allow to export CSV
      logger.info('Get the first %d token pairs', count)
      const marketsInfo = await dxInfoService.getMarkets({ count: count })
      const markets = marketsInfo.data
      logger.info('Found %d token pairs\n', markets.length)
      markets.forEach((market, number) => {
        logger.info('%d) %s-%s:',
          number + 1,
          market.tokenA.symbol,
          market.tokenB.symbol
        )
        printToken(market.tokenA, logger)
        printToken(market.tokenB, logger)
      })

      logger.info('')
      logger.info('Are ther more token pairs? %s', marketsInfo.startingAfter ? 'Yes' : 'No')
    })
}

function printToken (token, logger) {
  logger.info('')
  logger.info('  - Token: %s', token.symbol)
  logger.info('    Name: %s', token.name)
  logger.info('    Address: %s', token.address)
  logger.info('    Decimals: %d', token.decimals)
}
module.exports = registerCommand
