function registerCommand ({ cli, instances, logger }) {
  cli.command(
    'buy-liquidity <token-pair>',
    'Ensure the buy liquidity for a token pair',
    yargs => {
      yargs.positional('token-pair', {
        type: 'string',
        default: 'ETH-RDN',
        describe: 'The token pair of the auction'
      })
      yargs.positional('buyToken', {
        type: 'string',
        default: 'RDN',
        describe: 'Name of the buy token'
      })
    }, async function (argv) {
      const { tokenPair } = argv
      const [ sellToken, buyToken ] = tokenPair.split('-')
      const {
        botAccount,
        liquidityService
      } = instances
      logger.info(`Ensure the BUY liquidity for ${sellToken}-${buyToken}`)
      const boughtTokens = await liquidityService.ensureBuyLiquidity({
        sellToken,
        buyToken,
        from: botAccount
      })

      if (boughtTokens.length > 0) {
        boughtTokens.forEach(buyOrder => {
          // The bot sold some tokens
          logger.info({
            sellToken,
            buyToken,
            msg: "I've bought %d %s (%d USD) to ensure liquidity",
            params: [
              buyOrder.amount.div(1e18),
              buyOrder.buyToken,
              buyOrder.amountInUSD
            ]
          })
        })
      } else {
        // The bot didn't have to do anything
        logger.info({
          msg: 'There\'s no need to ensure buy liquidity'
        })
      }
    })
}

module.exports = registerCommand
