const cliUtils = require('../helpers/cliUtils')

function registerCommand ({ cli, instances, logger }) {
  cli.command('claimable-tokens <token-pairs> [count]', 'Get the claimable tokens for a list of token pair (i.e. claimable-tokens WETH-RDN,WETH-OMG)', yargs => {
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
      const { sellerClaims, buyerClaims } = await dxInfoService.getClaimableTokens({
        tokenA: sellToken,
        tokenB: buyToken,
        address: botAccount,
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
