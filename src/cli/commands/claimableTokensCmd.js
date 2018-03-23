const cliUtils = require('../helpers/cliUtils')
const printState = require('../helpers/printState')

function registerCommand ({ cli, instances, logger }) {
  cli.command('claimable-tokens <token-pairs> [count]', 'Get the claimable tokens for a list of token pair (i.e. claimable-tokens ETH-RDN,ETH-OMG)', yargs => {
    cliUtils.getPositionalByName('token-pairs', yargs)
    cliUtils.getPositionalByName('count', yargs)
  }, async function (argv) {
    const { tokenPairs: tokenPairString, count } = argv
    const tokenPairs = cliUtils.toTokenPairs(tokenPairString)

    const {
      botAccount,
      dxInfoService
    } = instances

    logger.info('Showing last %d auctions claimable balances for %s:',
      count, botAccount)
    tokenPairs.forEach(async tokenPair => {
      const { sellToken, buyToken } = tokenPair
      const sellerBalances = await dxInfoService.getClaimableAuctions({
        tokenA: sellToken,
        tokenB: buyToken,
        address: botAccount,
        count
      })
      sellerBalances.forEach(({
        sellerBalanceA,
        buyerBalanceA,
        sellerBalanceB,
        buyerBalanceB,
        auctionIndex
      }) => {
        _printBalances({
          auctionIndex,
          sellToken,
          buyToken,
          sellerBalance: sellerBalanceA,
          buyerBalance: buyerBalanceA,
          logger
        })
        _printBalances({
          auctionIndex,
          sellToken: buyToken,
          buyToken: sellToken,
          sellerBalance: sellerBalanceB,
          buyerBalance: buyerBalanceB,
          logger
        })
      })
    })
  })
}

function _printBalances ({
  auctionIndex,
  sellToken,
  buyToken,
  sellerBalance,
  buyerBalance,
  logger
}) {
  logger.info(`\t- %d. %s-%s balances: (%d %s) + (%d %s)`,
    auctionIndex,
    sellToken,
    buyToken,
    sellerBalance ? sellerBalance.div(1e18) : 0,
    sellToken,
    buyerBalance ? buyerBalance.div(1e18) : 0,
    buyToken
  )
}

module.exports = registerCommand
