
const cliUtils = require('../helpers/cliUtils')
const { toWei } = require('../../helpers/numberUtil')

const getAddress = require('../../helpers/getAddress')
const getArbitrageContractAddress = require('../helpers/getArbitrageContractAddress')
const getArbitrageService = require('../../services/ArbitrageService')

function registerCommand ({ cli, logger }) {
  cli.command(
    'arb-withdraw-ether <amount> [--arbitrageContractAddress arbitrageAddress]',
    'Withdraw WETH from DutchX and convert to ETH',
    yargs => {
      cliUtils.addPositionalByName('amount', yargs)
      yargs.option('arbitrageAddress', {
        type: 'string',
        describe: 'The arbitrage contract address to use'
      })
    }, async function (argv) {
      const { amount, arbitrageAddress } = argv
      const DEFAULT_ACCOUNT_INDEX = 0
      const [
        from,
        confArbitrageContractAddress,
        arbitrageService
      ] = await Promise.all([
        getAddress(DEFAULT_ACCOUNT_INDEX),
        getArbitrageContractAddress(),
        getArbitrageService()
      ])

      let arbitrageContractAddress = arbitrageAddress
      if (!arbitrageAddress) {
        arbitrageContractAddress = confArbitrageContractAddress
      }

      logger.info(`Transfer %d WETH from DutchX and convert to ETH`,
        amount
      )
      const withdrawTransfer = await arbitrageService.withdrawEther({
        amount: toWei(amount),
        from,
        arbitrageContractAddress
      })
      logger.info('The withdrawEther tx was successful. Transaction: %s', withdrawTransfer.tx)
    })
}

module.exports = registerCommand
