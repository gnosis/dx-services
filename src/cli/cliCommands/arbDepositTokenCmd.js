const cliUtils = require('../helpers/cliUtils')

const getAddress = require('../../helpers/getAddress')
const getArbitrageService = require('../../services/ArbitrageService')

function registerCommand ({ cli, logger }) {
  cli.command(
    'arbDepositToken <amount> <token>',
    'Deposit any token in the contract to the dx',
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

      logger.info(`Deposit %d Token (%s) using the account %s`,
      amount,
      token,
      from
      )
      const depositResult = await arbitrageService.depositToken({
        token,
        amount: amount * 1e18,
        from
      })
      logger.info('The deposit was succesful. Transaction: %s', depositResult.tx)
    })
}

module.exports = registerCommand
