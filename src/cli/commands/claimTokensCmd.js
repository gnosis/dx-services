const cliUtils = require('../helpers/cliUtils')

function registerCommand ({ cli, instances, logger }) {
  cli.command('claim-tokens <token-pair> [count]', 'Claim tokens for N auctions of a token pair (i.e. claim-tokens WETH-RDN)', yargs => {
    cliUtils.getPositionalByName('token-pair', yargs)
    cliUtils.getPositionalByName('count', yargs)
  }, async function (argv) {
    const { tokenPair, count } = argv

    const {
      botAccount,
      dxTradeService
    } = instances

    logger.info('Claiming last %d auctions for %s:',
      count, botAccount)
    const [ tokenA, tokenB ] = tokenPair.split('-')
    const [ sellerClaimResult, buyerClaimResult ] = await dxTradeService.claimAll({
      tokenA, tokenB, address: botAccount, lastNAuctions: count
    })
    logger.info('The seller claim was succesful. Transaction: %s', sellerClaimResult.tx)
    logger.info('The buyer claim was succesful. Transaction: %s', buyerClaimResult.tx)
  })
}

module.exports = registerCommand
