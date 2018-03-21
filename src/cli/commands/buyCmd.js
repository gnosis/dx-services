function registerCommand ({ cli, instances, logger }) {
  cli.command(
    'buy <amount> <token-pair> [auctionIndex]',
    'Buy in a auction for a token pair',
    yargs => {
      yargs.positional('amount', {
        type: 'float',
        describe: 'Amount to buy'
      })
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
      const { amount, tokenPair, auctionIndex: auctionIndexAux } = argv
      const [ sellToken, buyToken ] = tokenPair.split('-')
      const {
        botAccount,
        dxInfoService,
        dxTradeService
      } = instances

      // Get auction index
      let auctionIndex
      if (auctionIndexAux) {
        auctionIndex = auctionIndexAux
      } else {
        auctionIndex = await dxInfoService.getAuctionIndex({
          sellToken, buyToken
        })
      }

      logger.info(`Buy %d %s on ${sellToken}-${buyToken} (%s) using the account %s`,
        amount,
        buyToken,
        'auction ' + auctionIndex,
        botAccount
      )
      const buyResult = await dxTradeService.buy({
        sellToken,
        buyToken,
        auctionIndex,
        amount: amount * 1e18,
        from: botAccount
      })
      logger.info('The buy was succesful. Transaction: %s', buyResult.tx)
    })
}

module.exports = registerCommand
