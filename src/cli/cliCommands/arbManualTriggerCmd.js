const cliUtils = require('../helpers/cliUtils')

const getAddress = require('../../helpers/getAddress')
const getArbitrageService = require('../../services/ArbitrageService')

function registerCommand ({ cli, logger }) {
  cli.command(
    'arbitrage',
    'Attempt an arbitrage',
    yargs => {
      // cliUtils.addPositionalByName('amount', yargs)
    }, async function (argv) {
      // const { amount } = argv
      const DEFAULT_ACCOUNT_INDEX = 0
      const [
        from,
        arbitrageService
      ] = await Promise.all([
        getAddress(DEFAULT_ACCOUNT_INDEX),
        getArbitrageService()
      ])

      // Get auction index
      const balance = await arbitrageService.getContractEtherBalance()

      logger.info(`Deposit %d Eth plus balance of %d as WETH using the account %s`,
      amount,
      balance.toString(10),
      from
      )
      const depositResult = await arbitrageService.depositEther({
        amount: amount * 1e18,
        from
      })
      logger.info('The deposit was succesful. Transaction: %s', depositResult.tx)
    })
}

module.exports = registerCommand
