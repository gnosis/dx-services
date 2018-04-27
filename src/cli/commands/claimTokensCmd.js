const cliUtils = require('../helpers/cliUtils')

function registerCommand ({ cli, instances, logger }) {
  cli.command('claim-tokens <token-pair> [count]', 'Claim tokens for N auctions of a token pair (i.e. claim-tokens WETH-RDN)', yargs => {
    cliUtils.getPositionalByName('token-pair', yargs)
    cliUtils.getPositionalByName('count', yargs)
  }, async function (argv) {
    const { tokenPair, count } = argv
    // const tokenPairs = cliUtils.toTokenPairs(tokenPairString)

    const {
      botAccount,
      dxTradeService
    } = instances

    logger.info('Claiming last %d auctions for %s:',
      count, botAccount)
    const [ tokenA, tokenB ] = tokenPair.split('-')
    await dxTradeService.claimAll({
      tokenA, tokenB, address: botAccount, count
    })
    // const { sellerClaims, buyerClaims } = await dxInfoService.getClaimableTokens({
    //   tokenA: sellToken,
    //   tokenB: buyToken,
    //   address: botAccount,
    //   count
    // })
    //
    // logger.info('Seller claimable tokens:')
    // sellerClaims.forEach(claim =>
    //   _printClaims(claim, sellToken, logger)
    // )
    //
    // logger.info('Buyer claimable tokens:')
    // buyerClaims.forEach(claim =>
    //   _printClaims(claim, buyToken, logger)
    // )
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
