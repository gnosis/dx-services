const cliUtils = require('../helpers/cliUtils')
const formatUtil = require('../../helpers/formatUtil')

function registerCommand ({ cli, instances, logger }) {
  cli.command(
    'get-allowance <account> <token>',
    'Get the allowance for the DutchX for a given user and token',
    yargs => {
      cliUtils.addPositionalByName('account', yargs)
      cliUtils.addPositionalByName('token', yargs)
    }, async function (argv) {
      const { account: accountAddress, token } = argv
      const {
        dxTradeService
      } = instances

      logger.info(`Get the DutchX allowance of:
  Account: %s
  Token: %s`,
      accountAddress,
      token
      )

      const allowance = await dxTradeService.getAllowance({
        token,
        accountAddress
      })

      logger.info('Allowance: %s', allowance.div(1e18).toNumber())
    })
}

module.exports = registerCommand
