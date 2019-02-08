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


      const ethToken = await arbitrageService.ethToken()

      // Get auction index
      await liquidityService.ensureSellLiquidity({
        sellToken: token,
        buyToken: ethToken,
        from
      })
      //  async ensureSellLiquidity ({ sellToken, buyToken, from, waitToReleaseTheLock = true }) {
      // logger.info('The deposit was succesful. Transaction: %s', depositResult.tx)
    })
}

module.exports = registerCommand
