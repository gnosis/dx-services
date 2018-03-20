function registerCommand ({ cli, instances, logger }) {
  cli.command(
    'buy <sellToken> <buyToken> <amount> [auctionIndex]',
    'Buy in a auction for a token pair',
    yargs => {
      yargs.positional('sellToken', {
        type: 'string',
        default: 'ETH',
        describe: 'Name of the sell token'
      })
      yargs.positional('buyToken', {
        type: 'string',
        default: 'RDN',
        describe: 'Name of the buy token'
      })
      yargs.positional('amount', {
        type: 'float',
        describe: 'Amount to buy'
      })
      yargs.positional('auctionIndex', {
        type: 'integer',
        default: null,
        describe: 'Index of the auction'
      })
    }, async function (argv) {
      const { sellToken, buyToken, amount, auctionIndex: auctionIndexAux } = argv
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
        auctionIndex ? 'auction ' + auctionIndex : 'last auction: ' + auctionIndex,
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
