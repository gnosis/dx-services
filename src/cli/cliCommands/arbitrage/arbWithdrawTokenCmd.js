
const cliUtils = require('../helpers/cliUtils')
const { toWei } = require('../../../helpers/numberUtil')

const getAddress = require('../../helpers/getAddress')
const getArbitrageService = require('../../services/ArbitrageService')

function registerCommand ({ cli, logger }) {
  cli.command(
    'arb-withdraw-token <amount> <token>',
    'Withdraw token from DutchX',
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
        amount, token
      )
      const withdrawTransfer = await arbitrageService.withdrawToken({
        amount: toWei(amount),
        token,
        from
      })
      logger.info('The withdrawToken tx was successful. Transaction: %s', withdrawTransfer.tx)
    })
}

module.exports = registerCommand
