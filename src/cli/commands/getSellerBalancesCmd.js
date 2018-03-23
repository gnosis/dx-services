const cliUtils = require('../helpers/cliUtils')
const printState = require('../helpers/printState')

function registerCommand ({ cli, instances, logger }) {
  cli.command('seller-balances <token-pairs>', 'Get the seller balances for the las auctions (i.e. claimable-tokens ETH-RDN,ETH-OMG)', yargs => {
    cliUtils.getPositionalByName('token-pairs', yargs)
  }, async function (argv) {
    const { tokenPairs: tokenPairString } = argv
    const tokenPairs = cliUtils.toTokenPairs(tokenPairString)

    const {
      botAccount,
      dxInfoService
    } = instances

    const sellerBalances = await dxInfoService.getSellerBalancesOfCurrentAuctions({
      tokenPairs,
      address: botAccount
    })

    logger.info('Seller balances for %s:', botAccount)
    sellerBalances.forEach(({ sellToken, buyToken, balance }) => {
      logger.info(`\t- %s-%s: %d`,
        sellToken,
        buyToken,
        balance.div(1e18)
      )
    })

    // Print state
    console.log()
  })
}

module.exports = registerCommand
