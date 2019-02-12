const cliUtils = require('../helpers/cliUtils')

const getAddress = require('../../helpers/getAddress')
const getArbitrageService = require('../../services/ArbitrageService')
const getLiquidityService = require('../../services/LiquidityService')

function registerCommand ({ cli, logger }) {
  cli.command(
    'arbitrage <token>',
    'Attempt an arbitrage',
    yargs => {
      cliUtils.addPositionalByName('token', yargs)
    }, async function (argv) {
      const { token } = argv
      const DEFAULT_ACCOUNT_INDEX = 0
      const [
        from,
        arbitrageService,
        liquidityService
      ] = await Promise.all([
        getAddress(DEFAULT_ACCOUNT_INDEX),
        getArbitrageService(),
        getLiquidityService()
      ])

      console.log('ready')

      const ethToken = await arbitrageService.ethToken()
      console.log({ethToken})
      // Get auction index
      const depositResult = await liquidityService.ensureArbitrageLiquidity({
        sellToken: token,
        buyToken: ethToken,
        from
      }).catch(error => {
        logger.error('The deposit was NOT succesful.', error)

      }) 
      // async ensureArbitrageLiquidity ({ sellToken, buyToken, from, buyLiquidityRules, waitToReleaseTheLock = false }) {
      logger.info('The deposit was succesful. Transaction: %s', depositResult.tx)
    })
}

module.exports = registerCommand
