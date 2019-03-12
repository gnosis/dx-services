
const cliUtils = require('../helpers/cliUtils')

const getAddress = require('../../helpers/getAddress')
const getArbitrageService = require('../../services/ArbitrageService')

function registerCommand ({ cli, logger }) {
  cli.command(
    'arbWithdrawEther <amount>',
    'Withdraw WETH from dutchX and convert to Ether',
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

      logger.info(`Transfer %d Weth from DutchX and convert to Ether`,
      amount
      )
      const withdrawTransfer = await arbitrageService.withdrawEther({
        amount: amount * 1e18,
        from
      })
      logger.info('The withdrawEther tx was succesful. Transaction: %s', withdrawTransfer.tx)
    })
}

module.exports = registerCommand
