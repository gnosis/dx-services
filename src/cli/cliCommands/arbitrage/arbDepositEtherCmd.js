const cliUtils = require('../../helpers/cliUtils')
const { toWei } = require('../../../helpers/numberUtil')

const getAddress = require('../../../helpers/getAddress')
const getArbitrageContractAddress = require('../../helpers/getArbitrageContractAddress')
const getArbitrageService = require('../../../services/ArbitrageService')

function registerCommand ({ cli, logger }) {
  cli.command(
    'arb-deposit-ether <amount> [--arbitrageContractAddress arbitrageAddress]',
    'Deposit any Ether in the contract to the DutchX as WETH',
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

      const balance =
        await arbitrageService.getContractEtherBalance({ arbitrageContractAddress })

      logger.info(`Deposit %d ETH from owner plus balance of %d ETH already in \
contract %s as WETH using the account %s`,
      amount, balance.toString(10), arbitrageContractAddress, from
      )
      const depositResult = await arbitrageService.depositEther({
        amount: toWei(amount),
        from,
        arbitrageContractAddress
      })
      logger.info('The deposit was successful. Transaction: %s', depositResult.tx)
    })
}

module.exports = registerCommand
