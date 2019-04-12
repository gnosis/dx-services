const cliUtils = require('../../helpers/cliUtils')
const { toWei, fromWei } = require('../../../helpers/numberUtil')

const getAddress = require('../../../helpers/getAddress')
const getArbitrageContractAddress = require('../../helpers/getArbitrageContractAddress')
const getArbitrageService = require('../../../services/ArbitrageService')
const getDxInfoService = require('../../../services/DxInfoService')

function registerCommand ({ cli, logger }) {
  cli.command(
    'arb-transfer-token <amount> <token> [--arbitrageContractAddress arbitrageAddress]',
    'Transfer token balance from Arbitrage contract to contract owner (amount = 0 transfers total balance)',
    yargs => {
      cliUtils.addPositionalByName('amount', yargs)
      cliUtils.addPositionalByName('token', yargs)
      yargs.option('arbitrageAddress', {
        type: 'string',
        describe: 'The arbitrage contract address to use'
      })
    }, async function (argv) {
      const { amount, token, arbitrageAddress } = argv
      const DEFAULT_ACCOUNT_INDEX = 0
      const [
        from,
        confArbitrageContractAddress,
        arbitrageService,
        dxInfoService
      ] = await Promise.all([
        getAddress(DEFAULT_ACCOUNT_INDEX),
        getArbitrageContractAddress(),
        getArbitrageService(),
        getDxInfoService()
      ])

      let arbitrageContractAddress = arbitrageAddress
      if (!arbitrageAddress) {
        arbitrageContractAddress = confArbitrageContractAddress
      }
      const tokenBalance = await dxInfoService.getAccountBalanceForTokenNotDeposited({
        token, account: arbitrageContractAddress })

      if (tokenBalance.eq(0)) {
        logger.error('Can\'t transfer %s balance. There is only %d in arbitrage contract',
          token, tokenBalance)
        return
      }

      // TODO: check token decimals
      let transferAmount = amount
      if (amount.eq(0) || amount.gt(tokenBalance)) {
        transferAmount = fromWei(tokenBalance)
      }

      logger.info(`Transfer %d %s from Arbitrage contract (%s) to owner account %s`,
        transferAmount, token, arbitrageContractAddress, from
      )
      const transferTokenResult = await arbitrageService.transferToken({
        token,
        amount: toWei(transferAmount),
        from,
        arbitrageContractAddress
      })
      logger.info('The transferToken tx was successful. Transaction: %s', transferTokenResult.tx)
    })
}

module.exports = registerCommand
