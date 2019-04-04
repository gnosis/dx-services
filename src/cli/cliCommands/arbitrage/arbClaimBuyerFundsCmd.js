const cliUtils = require('../../helpers/cliUtils')

const getAddress = require('../../../helpers/getAddress')
const getArbitrageService = require('../../../services/ArbitrageService')

function registerCommand ({ cli, logger }) {
  cli.command(
    'arb-claim-buyer-funds <token> <auctionId>',
    'Claim buyer funds from an auction on the dutchX',
    yargs => {
      cliUtils.addPositionalByName('token', yargs)
      cliUtils.addPositionalByName('auctionId', yargs)
    }, async function (argv) {
      const { token, auctionId } = argv
      const DEFAULT_ACCOUNT_INDEX = 0
      const [
        from,
        arbitrageService
      ] = await Promise.all([
        getAddress(DEFAULT_ACCOUNT_INDEX),
        getArbitrageService()
      ])

      logger.info(`Claim buyer funds of token %s on the DutchX for auction %d`,
        token,
        auctionId
      )
      const claimBuyerFunds = await arbitrageService.claimBuyerFunds({
        token,
        auctionId,
        from
      })
      logger.info('The claimBuyerFunds tx was succesful. Transaction: %s', claimBuyerFunds.tx)
    })
}

module.exports = registerCommand
