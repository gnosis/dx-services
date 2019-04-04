const cliUtils = require('../../helpers/cliUtils')
const { toWei } = require('../../../helpers/numberUtil')

const getAddress = require('../../../helpers/getAddress')
const getArbitrageService = require('../../../services/ArbitrageService')

function registerCommand ({ cli, logger }) {
  cli.command(
    'arb-deposit-token <amount> <token>',
    'Deposit any token in the arbitrage contract to the DutchX',
    yargs => {
      cliUtils.addPositionalByName('amount', yargs)
      cliUtils.addPositionalByName('token', yargs)
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

      logger.info(`Deposit %d %s using the account %s`,
        amount, token, from
      )
      const depositResult = await arbitrageService.depositToken({
        token,
        amount: toWei(amount),
        from
      })
      logger.info('The deposit was successful. Transaction: %s', depositResult.tx)
    })
}

module.exports = registerCommand
