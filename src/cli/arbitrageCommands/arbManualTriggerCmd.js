const cliUtils = require('../helpers/cliUtils')

const getAddress = require('../../helpers/getAddress')
const getArbitrageContractAddress = require('../helpers/getArbitrageContractAddress')
const getArbitrageService = require('../../services/ArbitrageService')

function registerCommand ({ cli, logger }) {
  cli.command(
    'manual-trigger <token> [--arbitrage-contract address] [--minimum-usd-profit profit]',
    'Manually launch an arbitrage check',
    yargs => {
      cliUtils.addPositionalByName('token', yargs)
      yargs.option('arbitrage-contract', {
        type: 'string',
        describe: 'The arbitrage contract address to use'
      })
      yargs.option('minimum-usd-profit', {
        type: 'string',
        describe: 'The minimum USD expected profit to trigger arbitrage'
      })
    }, async function (argv) {
      const { token, arbitrageContract, minimumUsdProfit } = argv
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

      let arbitrageContractAddress = arbitrageContract
      if (!arbitrageContract) {
        arbitrageContractAddress = confArbitrageContractAddress
      }

      try {
        const arbitrageResult = await arbitrageService.checkUniswapArbitrage({
          sellToken: token,
          buyToken: ethToken,
          from,
          arbitrageContractAddress,
          minimumProfitInUsd: minimumUsdProfit
        })
        logger.info(`The arbitrage transaction \
${arbitrageResult.length > 0 ? 's were' : 'was'} successful. %o`, arbitrageResult)
      } catch (error) {
        logger.error('The arbitrage was NOT succesful.', error)
      }
    })
}

module.exports = registerCommand
