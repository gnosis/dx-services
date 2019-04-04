const cliUtils = require('../../helpers/cliUtils')

const getArbitrageService = require('../../../services/ArbitrageService')

function registerCommand ({ cli, logger }) {
  cli.command(
    'arb-get-balance [token] [--address address]',
    'Get the arbitrage contract balance of any token (blank token for Ether)',
    yargs => {
      cliUtils.addPositionalByName('token', yargs)
      yargs.option('address', {
        type: 'string',
        describe: 'Allow to specify an arbitrage contract address'
      })
    }, async function (argv) {
      const { token, address } = argv
      const [
        arbitrageService
      ] = await Promise.all([
        getArbitrageService()
      ])
      const logAddress = !address
        ? await arbitrageService.getArbitrageAddress()
        : address

      logger.info(`Checking balance of %s contract as well as on the DutchX`,
        logAddress)
      const { contractBalance, dutchBalance } =
        await arbitrageService.getBalance({ token, address })

      logger.info('Contract: %s', contractBalance.toString(10))
      logger.info('DutchX: %s', dutchBalance.toString(10))
    })
}

module.exports = registerCommand
