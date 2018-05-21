#!/usr/bin/env node
const loggerNamespace = 'cli'
const Logger = require('../helpers/Logger')
const logger = new Logger(loggerNamespace)
require('../helpers/gracefullShutdown')

const yargs = require('yargs')
const testSetup = require('../../tests/helpers/testSetup')

testSetup()
  .then(run)
  .catch(console.error)

async function run (instances) {
  const cli = yargs.usage('$0 <cmd> [args]')
  const commandParams = { cli, instances, logger }

  // Info commands
  require('./cliCommands/stateCmd')(commandParams)
  require('./cliCommands/priceCmd')(commandParams)
  require('./cliCommands/usdPriceComand')(commandParams)
  require('./cliCommands/marketPriceCmd')(commandParams)
  require('./cliCommands/closingPricesCmd')(commandParams)
  require('./cliCommands/getSellerBalanceCmd')(commandParams)
  require('./cliCommands/auctionBalancesTokensCmd')(commandParams)
  require('./cliCommands/indexCmd')(commandParams)

  // Trade commands
  require('./cliCommands/sendCmd')(commandParams)
  require('./cliCommands/depositCmd')(commandParams)
  require('./cliCommands/withdrawCmd')(commandParams)
  require('./cliCommands/buyCmd')(commandParams)
  require('./cliCommands/sellCmd')(commandParams)
  require('./cliCommands/tradesCmd')(commandParams)
  require('./cliCommands/auctionsCmd')(commandParams)
  require('./cliCommands/unwrapEtherCmd')(commandParams)
  require('./cliCommands/claimableTokensCmd')(commandParams)
  require('./cliCommands/claimTokensCmd')(commandParams)
  require('./cliCommands/claimSellerFundsCmd')(commandParams)
  require('./cliCommands/claimBuyerFundsCmd')(commandParams)
  
  // Liquidity commands
  require('./cliCommands/sellLiquidityCmd')(commandParams)
  require('./cliCommands/buyLiquidityCmd')(commandParams)

  // Setup commands (we might need to move this ones to `setup` cli)
  // add-token-pair, add-funding-for-test-user,...
  const width = Math.min(100, yargs.terminalWidth())
  const argv = cli
    .wrap(width)
    .help('h')
    .strict()
    // .showHelpOnFail(false, 'Specify --help for available options')
    .argv

  if (!argv._[0]) {
    cli.showHelp()
  }
}
