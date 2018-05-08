const cliUtils = require('../helpers/cliUtils')

function registerCommand ({ cli, instances, logger }) {
  cli.command('claim-tokens <token-pairs> [count]', 'Claim tokens for N auctions of a token pair (i.e. claim-tokens WETH-RDN)', yargs => {
    cliUtils.addPositionalByName('token-pairs', yargs)
    cliUtils.addPositionalByName('count', yargs)
  }, async function (argv) {
    const { tokenPairs: tokenPairString, count } = argv
    const tokenPairs = cliUtils.toTokenPairs(tokenPairString)

    const {
      botAccount,
      dxTradeService
    } = instances

    logger.info('Claiming last %d auctions for %s:',
      count, botAccount)
    const [ sellerClaimResult, buyerClaimResult ] = await dxTradeService.claimAll({
      tokenPairs, address: botAccount, lastNAuctions: count
    })
    logger.info('The seller claim was succesful. Transaction: %s', sellerClaimResult.tx)
    logger.info('The buyer claim was succesful. Transaction: %s', buyerClaimResult.tx)
  })
}

module.exports = registerCommand
