const cliUtils = require('../helpers/cliUtils')

const getAddress = require('../../helpers/getAddress')
const getArbitrageService = require('../../services/ArbitrageService')

function registerCommand ({ cli, logger }) {
  cli.command(
    'getBalance [token]',
    'Get the arbitrage contract balance of any token (blank token for Ether)',
    yargs => {
      cliUtils.addPositionalByName('token', yargs)
    }, async function (argv) {
      const { token } = argv
      const DEFAULT_ACCOUNT_INDEX = 0
      const [
        from,
        arbitrageService
      ] = await Promise.all([
        getAddress(DEFAULT_ACCOUNT_INDEX),
        getArbitrageService()
      ])

      logger.info(`Checking balance of contract as well as on the DutchX`)
      const {contractBalance, dutchBalance} = await arbitrageService.getBalance()

      logger.info('Contract: %s', contractBalance.toString(10))
      logger.info('DutchX: %s', dutchBalance.toString(10))


      // console.log('Contract:' + contractBalance.toString(10), 'DutchX:' + dutchBalance.toString(10))

      // logger.info(`Deposit %d Eth plus balance of %d as WETH using the account %s`,
      // amount,
      // balance,
      // from
      // )
      // const depositResult = await arbitrageService.depositEther({
      //   amount: amount * 1e18,
      //   from
      // })
      // logger.info('The deposit was succesful. Transaction: %s', depositResult.tx)
    })
}

module.exports = registerCommand
