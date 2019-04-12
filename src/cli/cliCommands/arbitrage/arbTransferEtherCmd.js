const cliUtils = require('../../helpers/cliUtils')
const { toWei, fromWei } = require('../../../helpers/numberUtil')

const getAddress = require('../../../helpers/getAddress')
const getArbitrageContractAddress = require('../../helpers/getArbitrageContractAddress')
const getArbitrageService = require('../../../services/ArbitrageService')

function registerCommand ({ cli, logger }) {
  cli.command(
    'arb-transfer-ether <amount> [--arbitrageContractAddress arbitrageAddress]',
    'Transfer ETH from Arbitrage contract to contract owner (amount = 0 transfers total balance)',
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

      const balance = await arbitrageService.getContractEtherBalance({ arbitrageContractAddress })

      if (balance.eq(0)) {
        logger.error('Can\'t transfer ETH balance. There is only %d in arbitrage contract',
          balance)
        return
      }

      let transferAmount = amount
      if (amount.eq(0) || amount.gt(balance)) {
        transferAmount = fromWei(balance)
      }

      logger.info(`Transfer %d ETH from Arbitrage contract (%s) to owner account %s`,
        transferAmount, arbitrageContractAddress, from
      )
      const transferEtherResult = await arbitrageService.transferEther({
        amount: toWei(transferAmount),
        from,
        arbitrageContractAddress
      })
      logger.info('The transferEther tx was succesful. Transaction: %s', transferEtherResult.tx)
    })
}

module.exports = registerCommand
