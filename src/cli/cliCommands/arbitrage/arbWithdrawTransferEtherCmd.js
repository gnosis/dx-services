const cliUtils = require('../../helpers/cliUtils')
const { toWei } = require('../../../helpers/numberUtil')

const getAddress = require('../../../helpers/getAddress')
const getArbitrageService = require('../../../services/ArbitrageService')

function registerCommand ({ cli, logger }) {
  cli.command(
    'arb-withdraw-transfer-ether <amount>',
    'Withdraw WETH from DutchX, convert to ETH and transfer to owner address',
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

      logger.info(`Withdraw %d WETH from DutchX, convert to ETH and transfer to owner account %s`,
        amount, from
      )
      const withdrawTransfer = await arbitrageService.withdrawEtherThenTransfer({
        amount: toWei(amount),
        from
      })
      logger.info('The withdrawEtherThenTransfer tx was successful. Transaction: %s', withdrawTransfer.tx)
    })
}

module.exports = registerCommand
