const cliUtils = require('../helpers/cliUtils')
const getAddress = require('../../helpers/getAddress')

function registerCommand ({ cli, instances, logger }) {
  cli.command(
    'sell <amount> <token-pair> [auction-index]',
    'Sell in a auction for a token pair',
    yargs => {
      cliUtils.addPositionalByName('amount', yargs)
      cliUtils.addPositionalByName('token-pair', yargs)
      cliUtils.addPositionalByName('auction-index', yargs)
    }, async function (argv) {
      const { amount, auctionIndex: auctionIndexParam, tokenPair } = argv
      const [ sellToken, buyToken ] = tokenPair.split('-')
      const {
        dxInfoService,
        dxTradeService
      } = instances

      const [
        botAccount
      ] = await Promise.all([
        getAddress(0),
      ])

      // Get auction index
      let auctionIndex
      if (auctionIndexParam) {
        auctionIndex = auctionIndexParam
      } else {
        const [ auctionIndexCurrent, state ] = await Promise.all([
          dxInfoService.getAuctionIndex({ sellToken, buyToken }),
          dxInfoService.getState({ sellToken, buyToken })
        ])

        if (state === 'WAITING_FOR_FUNDING' || state === 'WAITING_FOR_AUCTION_TO_START') {
          // If we are in a waiting period
          auctionIndex = auctionIndexCurrent
        } else {
          // If the prior auction is not cleared yet
          auctionIndex = auctionIndexCurrent + 1
        }
      }

      logger.info(`Sell %d %s on ${sellToken}-${buyToken} (%s) using the account %s`,
        amount,
        sellToken,
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
