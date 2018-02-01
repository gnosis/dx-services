#!/usr/bin/env node
const commander = require('commander')

const getVersion = require('../../../src/helpers/getVersion')
const testSetup = require('../../helpers/testSetup')
testSetup()
  .then(run)
  .catch(console.error)

async function run ({
  auctionRepo,
  ethereumClient,
  address
}) {


  async function printTime (message) {
    const time = await ethereumClient.geLastBlockTime()
    console.log(message+'\t', time.toUTCString())
  }

  commander
    .version(getVersion(), '-v, --version')
    .option('-n, --now', 'Show current time')
    .option('-t, --time <hours>', 'Increase time of the blockchain in hours', parseFloat)
    .option('-m, --mine', 'Mine one block')
    .parse(process.argv)


  if (commander.now) {
    printTime('Current time')
  } else if (commander.time) {
    printTime('Time before increase time')
    await ethereumClient.increaseTime(commander.time * 60 * 60)
    printTime(`Time after increase ${commander.time} hours`)
  } else if (commander.mine) {
    printTime('Time before minining: ')
    await ethereumClient.mineBlock()
    printTime('Time after minining: ')
  } else {
    commander.help()
  }
}
