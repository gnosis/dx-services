const cliUtils = require('../helpers/cliUtils')

const getArbitrageContractAddress = require('../helpers/getArbitrageContractAddress')
const getArbitrageService = require('../../services/ArbitrageService')

function registerCommand ({ cli, logger }) {
  cli.command(
    'arb-get-balance [token] [--arbitrageContractAddress arbitrageAddress]',
    'Get the arbitrage contract balance of any token (blank token for Ether)',
    yargs => {
      cliUtils.addPositionalByName('token', yargs)
      yargs.option('arbitrageAddress', {
        type: 'string',
        describe: 'The arbitrage contract address to use'
      })
    }, async function (argv) {
      const { token, arbitrageAddress } = argv
      const [
        confArbitrageContractAddress,
        arbitrageService
      ] = await Promise.all([
        getArbitrageContractAddress(),
        getArbitrageService()
      ])

      let arbitrageContractAddress = arbitrageAddress
      if (!arbitrageAddress) {
        arbitrageContractAddress = confArbitrageContractAddress
      }

      logger.info(`Checking balance of %s contract as well as on the DutchX`,
        arbitrageContractAddress)
      const { contractBalance, dutchBalance } =
        await arbitrageService.getBalance({ token, arbitrageContractAddress })

      logger.info('Contract: %s', contractBalance.toString(10))
      logger.info('DutchX: %s', dutchBalance.toString(10))
    })
}

module.exports = registerCommand
