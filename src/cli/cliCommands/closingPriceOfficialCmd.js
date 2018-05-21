const cliUtils = require('../helpers/cliUtils')
const formatUtil = require('../../helpers/formatUtil')

function registerCommand ({ cli, instances, logger }) {
  cli.command(
    'closing-price-official <token-pair> <auctionIndex>',
    'Get the closing price for a given auction',
    yargs => {
      cliUtils.addPositionalByName('token-pair', yargs)
      cliUtils.addPositionalByName('auction-index', yargs)
    }, async function (argv) {
      const { tokenPair, auctionIndex } = argv
      const [ sellToken, buyToken ] = tokenPair.split('-')

      const {
        dxInfoService
      } = instances

      // Get auction index
      const closingPrice = await dxInfoService.getLastAvaliableClosingPrice({
        sellToken, buyToken, auctionIndex
      })
      logger.info('The last avaliable closing price for auction %d of %s is: %s',
        auctionIndex, tokenPair, formatUtil.formatNumber(closingPrice))
    })
}

module.exports = registerCommand
