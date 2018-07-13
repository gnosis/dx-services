const cliUtils = require('../helpers/cliUtils')

function registerCommand ({ cli, instances, logger }) {
  cli.command(
    'claimable-tokens <token-pairs> [count] [--acount account]',
    'deposit <amount> <token> [--acount account]',
    yargs => {
      cliUtils.addPositionalByName('token-pairs', yargs)
      cliUtils.addPositionalByName('count', yargs)
      cliUtils.addPositionalByName('account', yargs)
    },
    async function (argv) {
      const { tokenPairs: tokenPairString, account, count } = argv
      const tokenPairs = cliUtils.toTokenPairs(tokenPairString)

      const {
        botAccount,
        dxInfoService
      } = instances

      const accountAddress = account || botAccount

      logger.info('Showing last %d auctions claimable balances for %s:',
        count, accountAddress)

      tokenPairs.forEach(async tokenPair => {
        const { sellToken, buyToken } = tokenPair
        const { sellerClaims, buyerClaims } = await dxInfoService.getClaimableTokens({
          tokenA: sellToken,
          tokenB: buyToken,
          address: accountAddress,
          lastNAuctions: count
        })
        sellerClaims.length > 0
          ? logger.info('Seller claimable tokens for %s-%s:', sellToken, buyToken)
          : logger.info('No seller claimable tokens for %s-%s', sellToken, buyToken)
        sellerClaims.forEach(({ auctionIndex, amount }, index) =>
          _printClaims({
            auctionIndex,
            amount,
            sellToken,
            buyToken
          }, sellToken, logger)
        )

        buyerClaims.length > 0
          ? logger.info('Buyer claimable tokens for %s-%s:', sellToken, buyToken)
          : logger.info('No buyer claimable tokens for %s-%s', sellToken, buyToken)
        buyerClaims.forEach(({ auctionIndex, amount }, index) =>
          _printClaims({
            auctionIndex,
            amount,
            sellToken,
            buyToken
          }, buyToken, logger)
        )
      })
    })
}

function _printClaims ({
  sellToken,
  buyToken,
  auctionIndex,
  amount
}, token, logger) {
  logger.info(`\t- %d. %s-%s: %d %s`,
    auctionIndex,
    sellToken,
    buyToken,
    amount.div(1e18),
    token
  )
}

module.exports = registerCommand
