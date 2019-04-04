const cliUtils = require('../helpers/cliUtils')
const { toWei } = require('../../../helpers/numberUtil')

const getAddress = require('../../helpers/getAddress')
const getArbitrageService = require('../../services/ArbitrageService')

function registerCommand ({ cli, logger }) {
  cli.command(
    'arb-uniswap-opportunity <token> <amount>',
    'Execute a Uniswap Opportunity transaction with Arbitrage contract',
    yargs => {
      cliUtils.addPositionalByName('token', yargs)
      cliUtils.addPositionalByName('amount', yargs)
    }, async function (argv) {
      const { amount, token } = argv
      const DEFAULT_ACCOUNT_INDEX = 0
      const [
        from,
        arbitrageService
      ] = await Promise.all([
        getAddress(DEFAULT_ACCOUNT_INDEX),
        getArbitrageService()
      ])

      logger.info(`Arbitrage %d ETH on Uniswap for token %s using the account %s`,
        amount, token, from
      )

      const uniswapResult = await arbitrageService.uniswapOpportunity({
        arbToken: token,
        amount: toWei(amount),
        from
      })
      logger.info('The uniswapOpportunity was successful. Transaction: %s', uniswapResult.tx)
    })
}

module.exports = registerCommand
