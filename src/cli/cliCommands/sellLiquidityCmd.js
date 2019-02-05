const cliUtils = require('../helpers/cliUtils')

const getAddress = require('../../helpers/getAddress')
const getLiquidityService = require('../../services/LiquidityService')

function registerCommand ({ cli, logger }) {
  cli.command(
    'sell-liquidity <token-pair>',
    'Ensure the sell liquidity for a token pair',
    yargs => {
      cliUtils.addPositionalByName('token-pair', yargs)
    }, async function (argv) {
      const { tokenPair } = argv
      const [ sellToken, buyToken ] = tokenPair.split('-')
      const DEFAULT_ACCOUNT_INDEX = 0
      const [
        address,
        liquidityService
      ] = await Promise.all([
        getAddress(DEFAULT_ACCOUNT_INDEX),
        getLiquidityService()
      ])

      logger.info(`Ensure the SELL liquidity for ${sellToken}-${buyToken}`)
      const soldTokens = await liquidityService.ensureSellLiquidity({
        sellToken,
        buyToken,
        from: address
      })

      if (soldTokens.length > 0) {
        soldTokens.forEach(sellOrder => {
          // The bot sold some tokens
          logger.info({
            sellToken,
            buyToken,
            msg: "I've sold %d %s (%d USD) to ensure liquidity",
            params: [
              sellOrder.amount.div(1e18),
              sellOrder.sellToken,
              sellOrder.amountInUSD
            ]
          })
        })
      } else {
        // The bot didn't have to do anything
        logger.info({
          msg: 'There\'s no need to ensure sell liquidity'
        })
      }
    })
}

module.exports = registerCommand
