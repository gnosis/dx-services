const cliUtils = require('../../helpers/cliUtils')
const { toWei } = require('../../../helpers/numberUtil')

const getAddress = require('../../../helpers/getAddress')
const getArbitrageService = require('../../../services/ArbitrageService')

function registerCommand ({ cli, logger }) {
  cli.command(
    'arb-deposit-ether <amount>',
    'Deposit any Ether in the contract to the DutchX as WETH',
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

      logger.info(`Deposit %d ETH from owner plus balance of %d ETH already in \
      contract as WETH using the account %s`,
      amount, balance.toString(10), from
      )
      const depositResult = await arbitrageService.depositEther({
        amount: toWei(amount),
        from
      })
      logger.info('The deposit was successful. Transaction: %s', depositResult.tx)
    })
}

module.exports = registerCommand
