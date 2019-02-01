#!/usr/bin/env node
const { MNEMONIC: DEFAULT_MNEMONIC } = require('../../conf/env/local-config')
const mnemonic = process.env.MNEMONIC || DEFAULT_MNEMONIC
process.env.MNEMONIC = mnemonic
const DEBUG = process.env.DEBUG || 'ERROR-*,WARN-*,INFO-*'
process.env.DEBUG = DEBUG

const loggerNamespace = 'cli'
const Logger = require('../helpers/Logger')
const logger = new Logger(loggerNamespace)
const gracefullShutdown = require('../helpers/gracefullShutdown')

// TODO: Remove instanceFactory (pull only instances needed in each command)
// TODO: If MARKETS is undefined or NULL --> load all
const yargs = require('yargs')
const instanceFactory = require('../helpers/instanceFactory')

instanceFactory()
  .then(run)
  .then(() => gracefullShutdown.shutDown())
  .catch(error => {
    console.error(error)
    gracefullShutdown.shutDown()
  })

async function run (instances) {
  const cli = yargs.usage('$0 <cmd> [args]')
  const commandParams = { cli, instances, logger }

  // Info commands
  require('./cliCommands/balancesCmd')(commandParams)
  require('./cliCommands/marketsCmd')(commandParams)
  require('./cliCommands/tokensCmd')(commandParams)
  require('./cliCommands/stateCmd')(commandParams)
  require('./cliCommands/priceCmd')(commandParams)
  require('./cliCommands/usdPriceComand')(commandParams)
  require('./cliCommands/marketPriceCmd')(commandParams)
  require('./cliCommands/closingPricesCmd')(commandParams)
  require('./cliCommands/getSellerBalanceCmd')(commandParams)
  require('./cliCommands/auctionBalancesTokensCmd')(commandParams)
  require('./cliCommands/indexCmd')(commandParams)
  require('./cliCommands/approvedCmd')(commandParams)
  require('./cliCommands/closingPriceCmd')(commandParams)
  require('./cliCommands/closingPriceOfficialCmd')(commandParams)
  require('./cliCommands/feesCmd')(commandParams)
  require('./cliCommands/claimingsCmd')(commandParams)

  // Trade commands
  require('./cliCommands/sendCmd')(commandParams)
  require('./cliCommands/getAllowance')(commandParams)
  require('./cliCommands/setAllowance')(commandParams)
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

  // Dx Management commands
  require('./cliCommands/addTokenPairCmd')(commandParams)

  // Arbitrage commands
  require('./cliCommands/arbTransferOwnership')(commandParams) // onlyOwner
  require('./cliCommands/arbDepositEtherCmd')(commandParams)
  require('./cliCommands/arbWithdrawTransferEtherCmd')(commandParams) // onlyOwner
  require('./cliCommands/arbTransferEtherCmd')(commandParams) // onlyOwner
  require('./cliCommands/arbDepositTokenCmd')(commandParams) // onlyOwner
  require('./cliCommands/arbTransferTokenCmd')(commandParams) // onlyOwner
  require('./cliCommands/arbUniswapOpportunityCmd')(commandParams)
  require('./cliCommands/arbDutchOpportunityCmd')(commandParams)

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
  } else {
    console.log('')
  }
}
