const printState = require('../helpers/printState')

function registerCommand ({ cli, instances, logger }) {
  cli.command('state <sellToken> <buyToken>', 'Get the state for a given pair', yargs => {
    yargs.positional('sellToken', {
      type: 'string',
      default: 'ETH',
      describe: 'Name of the sell token'
    })
    yargs.positional('buyToken', {
      type: 'string',
      default: 'RDN',
      describe: 'Name of the buy token'
    })
  }, async function (argv) {
    const { sellToken, buyToken } = argv
    const {
      ethereumClient, // TODO: use services instead
      auctionInfoService
    } = instances

    // Get data
    const tokenPair = { sellToken, buyToken }
    const now = await ethereumClient.geLastBlockTime()
    const marketDetails = await auctionInfoService.getMarketDetails(tokenPair)

    // Print state
    const message = `State of ${sellToken}-${buyToken}`
    printState({ logger, message, tokenPair, now, marketDetails })
  })
}

module.exports = registerCommand
