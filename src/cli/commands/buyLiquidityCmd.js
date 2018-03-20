function registerCommand ({ cli, instances, logger }) {
  cli.command(
    'buy-liquidity <sellToken> <buyToken>',
    'Ensure the buy liquidity for a token pair',
    yargs => {
      yargs.positional('sellToken', {
        type: 'string',
        default: 'ETH',
        describe: 'Name of the sell token'
      })
      yargs.positional('buyToken', {
        type: 'string',
        default: 'RDN',
        describe: 'Name of the buy token'
      })
    }, async function (argv) {
      const { sellToken, buyToken } = argv
      const {
        botAccount,
        liquidityService
      } = instances
      logger.info(`Ensure the BUY liquidity for ${sellToken}-${buyToken}`)
      const soldTokens = await liquidityService.ensureBuyLiquidity({
        sellToken,
        buyToken,
        from: botAccount
      })

      if (soldTokens) {
        // The bot sold some tokens
        logger.info({
          sellToken,
          buyToken,
          msg: "I've bought %d %s (%d USD) to ensure liquidity",
          params: [
            soldTokens.amount.div(1e18),
            soldTokens.sellToken,
            soldTokens.amountInUSD
          ]
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
