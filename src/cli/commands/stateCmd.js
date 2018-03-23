const cliUtils = require('../helpers/cliUtils')
const printState = require('../helpers/printState')

function registerCommand ({ cli, instances, logger }) {
  cli.command('state <token-pair>', 'Get the state for a given pair (i.e. ETH-RDN)', yargs => {
    cliUtils.getPositionalByName('token-pair', yargs)
  }, async function (argv) {
    const { tokenPair: tokenPairString } = argv
    const [ sellToken, buyToken ] = tokenPairString.split('-')
    const {
      ethereumClient, // TODO: use services instead
      dxInfoService
    } = instances

    // Get data
    const tokenPair = { sellToken, buyToken }
    const now = await ethereumClient.geLastBlockTime()
    const marketDetails = await dxInfoService.getMarketDetails(tokenPair)

    // Print state
    const message = `State of ${sellToken}-${buyToken}`
    printState({ logger, message, tokenPair, now, marketDetails })
  })
}

module.exports = registerCommand
