const cliUtils = require('../helpers/cliUtils')

function registerCommand ({ cli, instances, logger }) {
  cli.command(
    'withdraw <amount> <token>',
    'Withdraw the DX account depositing tokens into it',
    yargs => {
      cliUtils.getPositionalByName('amount', yargs)
      cliUtils.getPositionalByName('token', yargs)
    }, async function (argv) {
      const { amount, token } = argv
      const {
        botAccount,
        dxTradeService
      } = instances

      logger.info(`Withdraw %d %s into the DX for %s`,
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

      // const withdrawEtherResult = await dxTradeService.withdrawEther({
      //   amount: amount * 1e18,
      //   accountAddress: botAccount
      // })
      // logger.info('The withdraw was succesful. Transaction: %s', withdrawEtherResult.tx)
    })
}

module.exports = registerCommand
