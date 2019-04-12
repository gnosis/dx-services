const cliUtils = require('../helpers/cliUtils')

const getAddress = require('../../helpers/getAddress')
const getArbitrageContractAddress = require('../helpers/getArbitrageContractAddress')
const getArbitrageService = require('../../services/ArbitrageService')

function registerCommand ({ cli, logger }) {
  cli.command(
    'arb-claim-buyer-funds <token> <auctionId> [--arbitrageContractAddress arbitrageAddress]',
    'Claim buyer funds from an auction on the dutchX',
    yargs => {
      cliUtils.addPositionalByName('token', yargs)
      cliUtils.addPositionalByName('auctionId', yargs)
      yargs.option('arbitrageAddress', {
        type: 'string',
        describe: 'The arbitrage contract address to use'
      })
    }, async function (argv) {
      const { token, auctionId, arbitrageAddress } = argv
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

      logger.info(`Claim buyer funds of token %s on the DutchX for auction %d`,
        token,
        auctionId
      )
      const claimBuyerFunds = await arbitrageService.claimBuyerFunds({
        token,
        auctionId,
        from,
        arbitrageContractAddress
      })
      logger.info('The claimBuyerFunds tx was succesful. Transaction: %s', claimBuyerFunds.tx)
    })
}

module.exports = registerCommand
