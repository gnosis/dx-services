function registerCommand ({ cli, instances, logger }) {
  cli.command(
    'sell-liquidity <sellToken> <buyToken>',
    'Ensure the sell liquidity for a token pair',
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
      logger.info(`Ensure the SELL liquidity for ${sellToken}-${buyToken}`)
      const soldTokens = await liquidityService.ensureSellLiquidity({
        sellToken,
        buyToken,
        from: botAccount
      })

      if (soldTokens) {
        // The bot sold some tokens
        logger.info({
          sellToken,
          buyToken,
          msg: "I've sold %d %s (%d USD) to ensure liquidity",
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
