const cliUtils = require('../helpers/cliUtils')

function registerCommand ({ cli, instances, logger }) {
  cli.command(
    'withdraw <amount> <token>',
    'Withdraw from the DX account depositing tokens into user account',
    yargs => {
      cliUtils.addPositionalByName('amount', yargs)
      cliUtils.addPositionalByName('token', yargs)
    }, async function (argv) {
      const { amount, token } = argv
      const {
        botAccount,
        dxTradeService
      } = instances

      logger.info(`Withdraw %d %s from the DX for %s`,
        amount,
        token,
        botAccount
      )
      const depositResult = await dxTradeService.withdraw({
        token,
        amount: amount * 1e18,
        accountAddress: botAccount
      })
      logger.info('The withdraw was succesful. Transaction: %s', depositResult.tx)
    })
}

module.exports = registerCommand
