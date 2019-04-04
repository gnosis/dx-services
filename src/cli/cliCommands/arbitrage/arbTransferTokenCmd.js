const cliUtils = require('../../helpers/cliUtils')
const { toWei, fromWei } = require('../../../helpers/numberUtil')

const getAddress = require('../../../helpers/getAddress')
const getArbitrageService = require('../../../services/ArbitrageService')
const getDxInfoService = require('../../../services/DxInfoService')

function registerCommand ({ cli, logger }) {
  cli.command(
    'arb-transfer-token <amount> <token>',
    'Transfer token balance from Arbitrage contract to contract owner (amount = 0 transfers total balance)',
    yargs => {
      cliUtils.addPositionalByName('amount', yargs)
      cliUtils.addPositionalByName('token', yargs)
    }, async function (argv) {
      const { amount, token } = argv
      const DEFAULT_ACCOUNT_INDEX = 0
      const [
        from,
        arbitrageService,
        dxInfoService
      ] = await Promise.all([
        getAddress(DEFAULT_ACCOUNT_INDEX),
        getArbitrageService(),
        getDxInfoService()
      ])

      const arbitrageAddress = await arbitrageService.getArbitrageAddress()

      const tokenBalance = await dxInfoService.getAccountBalanceForTokenNotDeposited({
        token, account: arbitrageAddress })

      if (tokenBalance.eq(0)) {
        logger.error('Can\'t transfer %s balance. There is only %d in arbitrage contract',
          token, tokenBalance)
        return
      }

      // TODO: check token decimals
      if (amount.eq(0) || amount.gt(tokenBalance)) {
        amount = fromWei(tokenBalance)
      }

      logger.info(`Transfer %d %s from Arbitrage contract to owner account %s`,
        amount, token, from
      )
      const transferTokenResult = await arbitrageService.transferToken({
        token,
        amount: toWei(amount),
        from
      })
      logger.info('The transferToken tx was succesful. Transaction: %s', transferTokenResult.tx)
    })
}

module.exports = registerCommand
