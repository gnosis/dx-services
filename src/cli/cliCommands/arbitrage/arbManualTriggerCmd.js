const cliUtils = require('../../helpers/cliUtils')

const getAddress = require('../../../helpers/getAddress')
const getArbitrageService = require('../../../services/ArbitrageService')
const getLiquidityService = require('../../../services/LiquidityService')

function registerCommand ({ cli, logger }) {
  cli.command(
    'arb-manual-trigger <token>',
    'Manually launch an arbitrage check',
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

      const ethToken = await arbitrageService.ethToken()

      try {
        const arbitrageResult = await liquidityService.ensureArbitrageLiquidity({
          sellToken: token,
          buyToken: ethToken,
          from
        })
        logger.info(`The arbitrage transaction${arbitrageResult.length > 0 ? 's were' : 'was'} succesful. %o`, arbitrageResult)
      } catch (error) {
        logger.error('The arbitrage was NOT succesful.', error)
      }
    })
}

module.exports = registerCommand
