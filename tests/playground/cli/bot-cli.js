#!/usr/bin/env node
const commander = require('commander')

const getVersion = require('../../../src/helpers/getVersion')
const testSetup = require('../../helpers/testSetup')

const stateInfoProps = ['auctionIndex', 'auctionStart']
const auctionProps = [
  'buyVolume',
  'sellVolume',
  'closingPrice',
  'isClosed',
  'isTheoreticalClosed'
]

testSetup()
  .then(run)
  .catch(console.error)

async function run ({
  auctionRepo,
  ethereumClient,
  address,
  printProps,
  fractionFormatter
}) {

  const formatters = {
    closingPrice: fractionFormatter
  }

  function list (val) {
    return val.split(',')
  }

  async function printTime (message) {
    const time = await ethereumClient.geLastBlockTime()
    console.log(message+':\t', time.toUTCString())
  }

  async function printState (message, { sellToken, buyToken }) {
    const state = await auctionRepo.getState({ sellToken, buyToken })
    const stateInfo = await auctionRepo.getStateInfo({ sellToken, buyToken })

    console.log(`\n**********  ${message}  **********\n`)
    console.log(`\tState: ${state}`)

    console.log('\n\tState info:')
    printProps('\t\t', stateInfoProps, stateInfo)

    console.log(`\n\tAuction ${sellToken}-${buyToken}:`)
    printProps('\t\t', auctionProps, stateInfo.auction, formatters)

    console.log(`\n\tAuction ${buyToken}-${sellToken}:`)
    printProps('\t\t', auctionProps, stateInfo.auctionOpp, formatters)
    console.log('\n**************************************\n\n')
  }

  commander
    .version(getVersion(), '-v, --version')
    .option('-n, --now', 'Show current time')
    .option('-x, --state "<sell-token>,<buy-token>"', 'Show current state', list)
    .option('-t, --time <hours>', 'Increase time of the blockchain in hours', parseFloat)
    .option('-m, --mine', 'Mine one block')
    .option('-b, --buy "<sell-token>,<buy-token>,<amount>"', 'Buy tokens. i.e.', list)
    //.option('-s, --sell <sell-token> <buy-token> <amount>', 'Sell tokens')


  commander.on('--help', function(){
    console.log('\n\nExamples:');
    console.log('');
    console.log('\tbot-cli -n');
    console.log('\tbot-cli -x RDN,ETH')
    console.log('\tbot-cli -m');
    console.log('\tbot-cli -t 0.5');
    console.log('\tbot-cli -t 6');
    console.log('\tbot-cli -b RDN,ETH,100');
    console.log('\tbot-cli -s ETH,RDN,100');
    console.log('');
  })

  commander.parse(process.argv)

  if (commander.now) {
    // now
    printTime('Current time')

  } else if (commander.state) {
    // State
    const [buyToken, sellToken] = commander.state
    printState('State', { buyToken, sellToken})
  } else if (commander.time) {
    // time
    printTime('Time before increase time')
    await ethereumClient.increaseTime(commander.time * 60 * 60)
    printTime(`Time after increase ${commander.time} hours`)

  } else if (commander.mine) {
    // mine
    printTime('Time before minining: ')
    await ethereumClient.mineBlock()
    printTime('Time after minining: ')

  } else if (commander.buy) {
    // buy
    const [buyToken, sellToken, amountString] = commander.buy
    console.log(`Token:\n\t${sellToken}-${buyToken}`)
    printState('State before buy', { buyToken, sellToken})
    /*
    auctionRepo.buy({
      buyToken,
      sellToken,
      amount: parseInt(amountString)
    })
    */
  } else if (commander.sell) {
    // sell
    console.log('Sell ', commander.sell)

  } else {
    // help
    commander.help()
  }
}
