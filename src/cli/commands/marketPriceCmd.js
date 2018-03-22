function registerCommand ({ cli, instances, logger }) {
  cli.command(
    'market-price <token-pair>',
    'Get the market price for a token pair',
    yargs => {
      yargs.positional('token-pair', {
        type: 'string',
        default: 'ETH-RDN',
        describe: 'The token pair of the auction'
      })
      yargs.positional('auctionIndex', {
        type: 'integer',
        default: null,
        describe: 'Index of the auction'
      })
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
      logger.info('The market price is: %d', price)
    })
}

module.exports = registerCommand
