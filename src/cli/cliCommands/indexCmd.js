const cliUtils = require('../helpers/cliUtils')

function registerCommand ({ cli, instances, logger }) {
  cli.command(
    'index <token-pair>',
    'Get the auction index for a given auction',
    yargs => {
      cliUtils.addPositionalByName('token-pair', yargs)
    }, async function (argv) {
      const { tokenPair } = argv
      const [ sellToken, buyToken ] = tokenPair.split('-')

      const {
        dxInfoService
      } = instances

      // Get auction index
      const auctionIndex = await dxInfoService.getAuctionIndex({
        sellToken, buyToken
      })
      logger.info('The auction index for %s is %d', tokenPair, auctionIndex)
    })
}

module.exports = registerCommand
