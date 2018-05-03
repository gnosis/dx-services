const cliUtils = require('../helpers/cliUtils')

function registerCommand ({ cli, instances, logger }) {
  cli.command(
    'unwrap <amount>',
    'Unwrap WETH to get ETH in user account',
    yargs => {
      cliUtils.getPositionalByName('amount', yargs)
    }, async function (argv) {
      const { amount } = argv
      const {
        botAccount,
        dxTradeService
      } = instances

      logger.info(`Unwrap %d WETH into %s`,
        amount,
        botAccount
      )

      const withdrawEtherResult = await dxTradeService.withdrawEther({
        amount: amount * 1e18,
        accountAddress: botAccount
      })
      logger.info('The unwrap was succesful. Transaction: %s', withdrawEtherResult.tx)
    })
}

module.exports = registerCommand
