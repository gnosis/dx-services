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

  // Commands
  // require('./commands/hiCmd')(cli)
  // require('./commands/helloCmd')(cli)
  require('./commands/printStateCmd')(commandParams)
  
  var argv = cli
    .help()
    .strict()
    .argv

  if (!argv._[0]) {
    cli.showHelp()
  }
}
