const cliUtils = require('../helpers/cliUtils')

const getAddress = require('../../helpers/getAddress')
const getDxTradeService = require('../../services/DxTradeService')

function registerCommand ({ cli, logger }) {
  cli.command(
    'withdraw <amount> <token>',
    'Withdraw from the DX account depositing tokens into user account',
    yargs => {
      cliUtils.addPositionalByName('amount', yargs)
      cliUtils.addPositionalByName('token', yargs)
    }, async function (argv) {
      const { amount, token } = argv

      const DEFAULT_ACCOUNT_INDEX = 0
      const [
        accountAddress,
        dxTradeService
      ] = await Promise.all([
        getAddress(DEFAULT_ACCOUNT_INDEX),
        getDxTradeService()
      ])

      logger.info(`Withdraw %d %s from the DX for %s`,
        amount,
        token,
        accountAddress
      )
      const depositResult = await dxTradeService.withdraw({
        token,
        amount: amount * 1e18,
        accountAddress
      })
      logger.info('The withdraw was succesful. Transaction: %s', depositResult.tx)
    })
}

module.exports = registerCommand
