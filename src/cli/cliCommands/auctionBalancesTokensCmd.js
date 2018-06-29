const cliUtils = require('../helpers/cliUtils')

function registerCommand ({ cli, instances, logger }) {
  cli.command(
    'auction-balances <token-pairs> [count]',
    'Get the balances for the a list of token pair (i.e. claimable-tokens ETH-RDN,ETH-OMG)',
    yargs => {
      cliUtils.addPositionalByName('token-pairs', yargs)
      cliUtils.addPositionalByName('count', yargs)
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
        const auctionsBalances = await dxInfoService.getAuctionsBalances({
          tokenA: sellToken,
          tokenB: buyToken,
          address: botAccount,
          count
        })
        auctionsBalances.forEach(({
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
