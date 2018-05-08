const cliUtils = require('../helpers/cliUtils')

function registerCommand ({ cli, instances, logger }) {
  cli.command(
    'send <amount> <token> <account>',
    'Send tokens to another account',
    yargs => {
      cliUtils.addPositionalByName('amount', yargs)
      cliUtils.addPositionalByName('token', yargs)
      cliUtils.addPositionalByName('account', yargs)
    }, async function (argv) {
      const { amount, token, account } = argv
      const {
        owner,
        dxTradeService
      } = instances

      logger.info(`Send %d %s from %s to %s`,
        amount,
        token,
        owner,
        account
      )
      const sendTokensResult = await dxTradeService.sendTokens({
        token,
        amount: amount * 1e18,
        fromAddress: owner,
        toAddress: account
      })
      logger.info('The delivery was succesful. Transaction: %s', sendTokensResult.tx)
    })
}

module.exports = registerCommand
