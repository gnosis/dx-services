
const cliUtils = require('../helpers/cliUtils')

const getAddress = require('../../helpers/getAddress')
const getArbitrageService = require('../../services/ArbitrageService')

function registerCommand ({ cli, logger }) {
  cli.command(
    'arbWithdrawToken <amount> <token>',
    'Withdraw token from dutchX',
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

      logger.info(`Withdraw %d token (%s) from DutchX `,
      amount,
      token
      )
      const withdrawTransfer = await arbitrageService.withdrawToken({
        amount: amount * 1e18,
        token,
        from
      })
      logger.info('The withdrawToken tx was succesful. Transaction: %s', withdrawTransfer.tx)
    })
}

module.exports = registerCommand
