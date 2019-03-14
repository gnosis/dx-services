const cliUtils = require('../helpers/cliUtils')

const getAddress = require('../../helpers/getAddress')
const getArbitrageService = require('../../services/ArbitrageService')

function registerCommand ({ cli, logger }) {
  cli.command(
    'arbDutchOpportunity <token> <amount>',
    'Execute a Dutch Opportunity transaction with Arbitrage contract',
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

      logger.info(`Arbitrage %d WETH on the DutchX for token %s using the account %s`,
      amount,
      token,
      from
      )
      const dutchResult = await arbitrageService.dutchOpportunity({
        arbToken: token,
        amount: amount * 1e18,
        from
      })
      logger.info('The dutchOpportunity was succesful. Transaction: %s', dutchResult.tx)
    })
}

module.exports = registerCommand
