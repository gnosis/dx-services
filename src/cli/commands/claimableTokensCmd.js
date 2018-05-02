const cliUtils = require('../helpers/cliUtils')

function registerCommand ({ cli, instances, logger }) {
  cli.command('claimable-tokens <token-pairs> [count]', 'Get the claimable tokens for a list of token pair (i.e. claimable-tokens WETH-RDN,WETH-OMG)', yargs => {
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
      count, '0xbcc87b421e19b151c3af5d46a27af986211119e9')
    tokenPairs.forEach(async tokenPair => {
      const { sellToken, buyToken } = tokenPair
      const { sellerClaims, buyerClaims } = await dxInfoService.getClaimableTokens({
        tokenA: sellToken,
        tokenB: buyToken,
        address: '0xbcc87b421e19b151c3af5d46a27af986211119e9',
        lastNAuctions: count
      })

      logger.info('Seller claimable tokens:')
      const [ sellerClaimsIndex, sellerClaimsAmounts ] = sellerClaims
      sellerClaimsIndex.forEach((auctionIndex, index) =>
        _printClaims({
          auctionIndex,
          amount: sellerClaimsAmounts[index],
          sellToken,
          buyToken
        }, sellToken, logger)
      )

      logger.info('Buyer claimable tokens:')
      const [ buyerClaimsIndex, buyerClaimsAmounts ] = buyerClaims
      buyerClaimsIndex.forEach((auctionIndex, index) =>
        _printClaims({
          auctionIndex,
          amount: buyerClaimsAmounts[index],
          sellToken: buyToken,
          buyToken: sellToken
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
