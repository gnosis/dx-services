const cliUtils = require('../helpers/cliUtils')

function registerCommand ({ cli, instances, logger }) {
  cli.command(
    'market-price <token-pair>',
    'Get the market price for a token pair',
    yargs => {
      cliUtils.addPositionalByName('token-pair', yargs)
    }, async function (argv) {
      const { tokenPair } = argv
      const [ sellToken, buyToken ] = tokenPair.split('-')
      const {
        marketService
      } = instances

      logger.info(`Get market price for the token pair ${sellToken}-${buyToken}`)

      const price = await marketService.getPrice({
        tokenA: sellToken,
        tokenB: buyToken
      })
      logger.info('The market price is: %d %s/%s', price, buyToken, sellToken)
    })
}

module.exports = registerCommand
