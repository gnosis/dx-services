const cliUtils = require('../helpers/cliUtils')
const { toWei } = require('../../helpers/numberUtil')

const getAddress = require('../../helpers/getAddress')
const getDxTradeService = require('../../services/DxTradeService')

function registerCommand ({ cli, logger }) {
  cli.command(
    'send <amount> <token> <account>',
    'Send tokens to another account',
    yargs => {
      cliUtils.addPositionalByName('amount', yargs)
      cliUtils.addPositionalByName('token', yargs)
      cliUtils.addPositionalByName('account', yargs)
    }, async function (argv) {
      const { amount, token, account } = argv
      const DEFAULT_ACCOUNT_INDEX = 0
      const [
        owner,
        dxTradeService
      ] = await Promise.all([
        getAddress(DEFAULT_ACCOUNT_INDEX),
        getDxTradeService()
      ])

      logger.info(`Send %d %s from %s to %s`,
        amount,
        token,
        owner,
        account
      )
      const sendTokensResult = await dxTradeService.sendTokens({
        token,
        amount: toWei(amount),
        fromAddress: owner,
        toAddress: account
      })
      logger.info('The delivery was succesful. Transaction: %s', sendTokensResult.tx)
    })
}

module.exports = registerCommand
