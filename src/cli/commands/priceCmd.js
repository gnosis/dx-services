const cliUtils = require('../helpers/cliUtils')
const formatUtil = require('../../helpers/formatUtil')

function registerCommand ({ cli, instances, logger }) {
  cli.command(
    'price <token-pair>',
    'Get the current price for a token pair',
    yargs => {
      cliUtils.getPositionalByName('token-pair', yargs)
    }, async function (argv) {
      const { tokenPair } = argv
      const [ sellToken, buyToken ] = tokenPair.split('-')
      const {
        dxInfoService
      } = instances

      logger.info(`Get market price for the token pair ${sellToken}-${buyToken}`)

      const price = await dxInfoService.getCurrentPrice({
        sellToken,
        buyToken
      })
      logger.info('The current price is: %s %s/%s',
        (price !== null ? formatUtil.formatFraction(price) : 'N/A'),
        buyToken,
        sellToken
      )
    })
}

module.exports = registerCommand
