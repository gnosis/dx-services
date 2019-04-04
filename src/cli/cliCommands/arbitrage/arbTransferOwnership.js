const cliUtils = require('../../helpers/cliUtils')

const getAddress = require('../../../helpers/getAddress')
const getArbitrageService = require('../../../services/ArbitrageService')

function registerCommand ({ cli, logger }) {
  cli.command(
    'arb-transfer-ownership <address>',
    'Transfer ownership of the Arbitrage contract',
    yargs => {
      cliUtils.addPositionalByName('address', yargs)
    }, async function (argv) {
      const { address } = argv
      const DEFAULT_ACCOUNT_INDEX = 0
      const [
        from,
        arbitrageService
      ] = await Promise.all([
        getAddress(DEFAULT_ACCOUNT_INDEX),
        getArbitrageService()
      ])

      logger.info(`Transfer ownership of contract to %s from the account %s`,
        address, from
      )
      const transferOwnership = await arbitrageService.transferOwnership({
        address,
        from
      })
      logger.info('The transferOwnership tx was succesful. Transaction: %s', transferOwnership.tx)
    })
}

module.exports = registerCommand
