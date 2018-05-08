const cliUtils = require('../helpers/cliUtils')

function registerCommand ({ cli, instances, logger }) {
  cli.command(
    'buy <amount> <token-pair> [auction-index]',
    'Buy in a auction for a token pair',
    yargs => {
      cliUtils.addPositionalByName('amount', yargs)
      cliUtils.addPositionalByName('token-pair', yargs)
      cliUtils.addPositionalByName('auction-index', yargs)
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
