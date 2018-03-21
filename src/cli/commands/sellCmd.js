function registerCommand ({ cli, instances, logger }) {
  cli.command(
    'sell <amount> <token-pair> [auctionIndex]',
    'Sell in a auction for a token pair',
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
      const { amount, auctionIndex: auctionIndexAux, tokenPair } = argv
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

      logger.info(`Sell %d %s on ${sellToken}-${buyToken} (%s) using the account %s`,
        amount,
        buyToken,
        'auction ' + auctionIndex,
        botAccount
      )
      const buyResult = await dxTradeService.sell({
        sellToken,
        buyToken,
        auctionIndex,
        amount: amount * 1e18,
        from: botAccount
      })
      logger.info('The sell was succesful. Transaction: %s', buyResult.tx)
    })
}

module.exports = registerCommand
