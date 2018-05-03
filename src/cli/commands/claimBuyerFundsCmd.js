const cliUtils = require('../helpers/cliUtils')

function registerCommand ({ cli, instances, logger }) {
  cli.command('claim-buyer <token-pair> [auction-index]', 'Claim tokens as buyer in an auction', yargs => {
    cliUtils.getPositionalByName('token-pair', yargs)
    cliUtils.getPositionalByName('auction-index', yargs)
  }, async function (argv) {
    const { tokenPair, auctionIndex } = argv

    const {
      botAccount,
      dxTradeService
    } = instances

    logger.info('Claiming tokens as buyer for %s in auction %d:',
      botAccount, auctionIndex)
    const [ tokenA, tokenB ] = tokenPair.split('-')
    const claimResult = await dxTradeService.claimBuyerFunds({
      tokenA, tokenB, address: botAccount, auctionIndex
    })

    logger.info('The claim was succesful. Transaction: %s', claimResult.tx)
  })
}

module.exports = registerCommand
