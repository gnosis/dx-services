const cliUtils = require('../helpers/cliUtils')

const getAddress = require('../../helpers/getAddress')
const getArbitrageService = require('../../services/ArbitrageService')

function registerCommand ({ cli, logger }) {
  cli.command(
    'arbTransferEther <amount>',
    'Transfer Arbitrage contract Eth to contract owner (amount = 0 transfers total balance)',
    yargs => {
      cliUtils.addPositionalByName('amount', yargs)
    }, async function (argv) {
      const { amount } = argv
      const DEFAULT_ACCOUNT_INDEX = 0
      const [
        from,
        arbitrageService
      ] = await Promise.all([
        getAddress(DEFAULT_ACCOUNT_INDEX),
        getArbitrageService()
      ])

      const balance = await arbitrageService.getContractEtherBalance()

      if (balance.eq(0)) {
        logger.error('Can\'t transfer Eth balance of 0 from arbitrage contract')
        return
      }

      if (amount.eq(0) || amount.gt(balance)) {
        amount = balance / 1e18
      }

      logger.info(`Transfer %d Eth from Arbitrage contract to owner account %s`,
      amount,
      from
      )
      const transferEtherResult = await arbitrageService.transferEther({
        amount: amount * 1e18,
        from
      })
      logger.info('The transferEther tx was succesful. Transaction: %s', transferEtherResult.tx)
    })
}

module.exports = registerCommand
