const cliUtils = require('../helpers/cliUtils')

function registerCommand ({ cli, instances, logger }) {
  cli.command('claim-seller <token-pair> [auction-index]', 'Claim tokens as seller in an auction', yargs => {
    cliUtils.addPositionalByName('token-pair', yargs)
    cliUtils.addPositionalByName('auction-index', yargs)
  }, async function (argv) {
    const { tokenPair, auctionIndex } = argv

    const {
      botAccount,
      dxTradeService
    } = instances

    logger.info('Claiming tokens as seller for %s in auction %d:',
      botAccount, auctionIndex)
    const [ tokenA, tokenB ] = tokenPair.split('-')
    const claimResult = await dxTradeService.claimSellerFunds({
      tokenA, tokenB, address: botAccount, auctionIndex
    })

    logger.info('The claim was succesful. Transaction: %s', claimResult.tx)
  })
}

module.exports = registerCommand
