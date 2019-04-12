const cliUtils = require('../../helpers/cliUtils')

const getAddress = require('../../../helpers/getAddress')
const getArbitrageContractAddress = require('../../helpers/getArbitrageContractAddress')
const getArbitrageService = require('../../../services/ArbitrageService')

function registerCommand ({ cli, logger }) {
  cli.command(
    'arb-manual-trigger <token> [--arbitrageContractAddress arbitrageAddress]',
    'Manually launch an arbitrage check',
    yargs => {
      cliUtils.addPositionalByName('token', yargs)
      yargs.option('arbitrageAddress', {
        type: 'string',
        describe: 'The arbitrage contract address to use'
      })
    }, async function (argv) {
      const { token, arbitrageAddress } = argv
      const DEFAULT_ACCOUNT_INDEX = 0
      const [
        from,
        confArbitrageContractAddress,
        arbitrageService
      ] = await Promise.all([
        getAddress(DEFAULT_ACCOUNT_INDEX),
        getArbitrageContractAddress(),
        getArbitrageService()
      ])

      const ethToken = await arbitrageService.ethToken()

      let arbitrageContractAddress = arbitrageAddress
      if (!arbitrageAddress) {
        arbitrageContractAddress = confArbitrageContractAddress
      }

      try {
        const arbitrageResult = await arbitrageService.checkUniswapArbitrage({
          sellToken: token,
          buyToken: ethToken,
          from,
          arbitrageContractAddress
        })
        logger.info(`The arbitrage transaction${arbitrageResult.length > 0 ? 's were' : 'was'} succesful. %o`, arbitrageResult)
      } catch (error) {
        logger.error('The arbitrage was NOT succesful.', error)
      }
    })
}

module.exports = registerCommand
