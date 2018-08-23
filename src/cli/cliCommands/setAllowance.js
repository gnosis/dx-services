const cliUtils = require('../helpers/cliUtils')

function registerCommand ({ cli, instances, logger }) {
  cli.command(
    'set-allowance <account> <token> <amount>',
    'Set the allowance for the DutchX for a given user and token',
    yargs => {
      cliUtils.addPositionalByName('account', yargs)
      cliUtils.addPositionalByName('token', yargs)
      cliUtils.addPositionalByName('amount', yargs)
    }, async function (argv) {
      const { account: accountAddress, token, amount } = argv
      const {
        dxTradeService
      } = instances

      logger.info(`Get the DutchX allowance of:
  Account: %s
  Token: %s
  Amount: %d`,
      accountAddress,
      token,
      amount
      )

      const transactionResult = await dxTradeService.setAllowance({
        token,
        accountAddress,
        amount: amount * 1e18
      })

      logger.info({
        msg: 'Approved the DX to use %d %s on behalf of the user. Transaction: %s',
        params: [ amount, token, transactionResult.tx ]
      })
    })
}

module.exports = registerCommand
