const cliUtils = require('../helpers/cliUtils')

const getAddress = require('../../helpers/getAddress')
const getArbitrageService = require('../../services/ArbitrageService')

function registerCommand ({ cli, logger }) {
  cli.command(
    'arbWithdrawTransferEther <amount>',
    'Withdraw WETH from dutchX, convert to Ether and transfer to owner address',
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

      logger.info(`Transfer %d Weth from DutchX, convert to Ether and transfer to owner account %s`,
      amount,
      from
      )
      const withdrawTransfer = await arbitrageService.withdrawEtherThenTransfer({
        amount: amount * 1e18,
        from
      })
      logger.info('The withdrawEtherThenTransfer tx was succesful. Transaction: %s', withdrawTransfer.tx)
    })
}

module.exports = registerCommand
