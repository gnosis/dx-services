const cliUtils = require('../helpers/cliUtils')
const { toWei } = require('../../helpers/numberUtil')

const getAddress = require('../../helpers/getAddress')
const getArbitrageContractAddress = require('../helpers/getArbitrageContractAddress')
const getArbitrageService = require('../../services/ArbitrageService')

function registerCommand ({ cli, logger }) {
  cli.command(
    'arb-uniswap-opportunity <token> <amount> [--arbitrageContractAddress arbitrageAddress]',
    'Execute a Uniswap Opportunity transaction with Arbitrage contract',
    yargs => {
      cliUtils.addPositionalByName('token', yargs)
      cliUtils.addPositionalByName('amount', yargs)
      yargs.option('arbitrageAddress', {
        type: 'string',
        describe: 'The arbitrage contract address to use'
      })
    }, async function (argv) {
      const { amount, token, arbitrageAddress } = argv
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

      let arbitrageContractAddress = arbitrageAddress
      if (!arbitrageAddress) {
        arbitrageContractAddress = confArbitrageContractAddress
      }

      logger.info(`Arbitrage %d ETH on Uniswap for token %s using the account %s`,
        amount, token, from
      )

      const uniswapResult = await arbitrageService.uniswapOpportunity({
        arbToken: token,
        amount: toWei(amount),
        from,
        arbitrageContractAddress
      })
      logger.info('The uniswapOpportunity was successful. Transaction: %s', uniswapResult.tx)
    })
}

module.exports = registerCommand
