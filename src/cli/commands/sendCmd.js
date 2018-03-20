function registerCommand ({ cli, instances, logger }) {
  cli.command(
    'send <amount> <token> <account>',
    'Send tokens to another account',
    yargs => {
      yargs.positional('amount', {
        type: 'float',
        describe: 'Amount to buy'
      })
      yargs.positional('token', {
        type: 'string',
        default: 'ETH',
        describe: 'Name of the token'
      })
      yargs.positional('account', {
        type: 'string',
        describe: 'Address were you send the tokens'
      })
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
