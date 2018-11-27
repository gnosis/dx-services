const cliUtils = require('../helpers/cliUtils')

const getAddress = require('../../helpers/getAddress')
const getLiquidityService = require('../../services/LiquidityService')

function registerCommand ({ cli, logger }) {
  cli.command(
    'buy-liquidity <token-pair>',
    'Ensure the buy liquidity for a token pair',
    yargs => {
      cliUtils.addPositionalByName('token-pair', yargs)
    }, async function (argv) {
      const { tokenPair } = argv
      const [ sellToken, buyToken ] = tokenPair.split('-')
      const DEFAULT_ACCOUNT_INDEX = 0
      const [
        botAccount,
        liquidityService
      ] = await Promise.all([
        getAddress(DEFAULT_ACCOUNT_INDEX),
        getLiquidityService()
      ])

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
