const cliUtils = require('../helpers/cliUtils')

const getDxInfoService = require('../../services/DxInfoService')

function registerCommand ({ cli, logger }) {
  cli.command('seller-balance <token-pair> <auction-index> <account>', 'Get the seller balances for a given auction and account', yargs => {
    cliUtils.addPositionalByName('token-pair', yargs)
    cliUtils.addPositionalByName('auction-index', yargs)
    cliUtils.addPositionalByName('account', yargs)
  }, async function (argv) {
    const { tokenPair, auctionIndex, account } = argv
    const [ sellToken, buyToken ] = tokenPair.split('-')

    const dxInfoService = await getDxInfoService()

    const sellerBalance = await dxInfoService.getSellerBalance({
      sellToken,
      buyToken,
      auctionIndex,
      address: account
    })

    logger.info('Seller balance for %s-%d: %s %s',
      tokenPair, auctionIndex, sellerBalance.div(1e18).valueOf(), sellToken
    )
  })
}

module.exports = registerCommand
