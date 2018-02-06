#!/usr/bin/env node
const commander = require('commander')

const getVersion = require('../../../src/helpers/getVersion')
const testSetup = require('../../helpers/testSetup')

testSetup()
  .then(run)
  .catch(console.error)

function list (val) {
  return val.split(',')
}

async function run ({
  auctionRepo,
  ethereumClient,
  address,
  printProps,
  fractionFormatter,
  printTime,
  printState,
  addTokens,
  buySell
}) {
  commander
    .version(getVersion(), '-v, --version')
    .option('-n, --now', 'Show current time')
    .option('-x --state "<sell-token>,<buy-token>"', 'Show current state', list)
    .option('-z --add-tokens', 'Ads RDN-ETH') //  OMG-ETH and RDN-OMG
    .option('-k --closing-price "<sell-token>,<buy-token>,<auction-index>"', 'Show closing price', list)
    .option('-o --oracle <token>', 'Show oracle-price')
    .option('-t, --time <hours>', 'Increase time of the blockchain in hours', parseFloat)
    .option('-m, --mine', 'Mine one block')
    .option('-b, --buy "<sell-token>,<buy-token>,<amount>"', 'Buy tokens', list)
    .option('-s, --sell <sell-token> <buy-token> <amount>', 'Sell tokens', list)

  commander.on('--help', function () {
    console.log('\n\nExamples:')
    console.log('')
    console.log('\tbot-cli -n')
    console.log('\tbot-cli --state RDN,ETH')
    console.log('\tbot-cli --add-tokens')
    console.log('\tbot-cli --closing-price RDN,ETH,0')
    console.log('\tbot-cli --oracle ETH')
    console.log('\tbot-cli --mine')
    console.log('\tbot-cli --time 0.5')
    console.log('\tbot-cli --time 6')
    console.log('\tbot-cli --buy RDN,ETH,100')
    console.log('\tbot-cli --sell ETH,RDN,100')
    console.log('')
  })

  commander.parse(process.argv)

  if (commander.now) {
    // now
    await printTime('Current time')
  } else if (commander.state) {
    // State
    const [buyToken, sellToken] = commander.state
    await printState('State', { buyToken, sellToken })
  } else if (commander.addTokens) {
    // add tokens
    await printState('State before add tokens', {
      buyToken: 'RDN',
      sellToken: 'ETH'
    })
    await addTokens()
    await printState('State after add tokens', {
      buyToken: 'RDN',
      sellToken: 'ETH'
    })
  } else if (commander.closingPrice) {
    // closing price
    const [sellToken, buyToken, auctionIndex] = commander.closingPrice
    const closingPrice = await auctionRepo.getClosingPrices({
      sellToken, buyToken, auctionIndex
    })
    console.log('Closing price: ' + fractionFormatter(closingPrice))
  } else if (commander.oracle) {
    // Oracle price
    const token = commander.oracle
    const oraclePrice = await auctionRepo.getPriceOracle({ token })
    const price = fractionFormatter(oraclePrice)
    console.log(`Oracle price for ${token}: ${price}`)
  } else if (commander.time) {
    // time
    await printTime('Time before increase time')
    await ethereumClient.increaseTime(commander.time * 60 * 60)
    await printTime(`Time after increase ${commander.time} hours`)
  } else if (commander.mine) {
    // mine
    await printTime('Time before minining: ')
    await ethereumClient.mineBlock()
    await printTime('Time after minining: ')
  } else if (commander.buy) {
    // buy
    const [buyToken, sellToken, amountString] = commander.buy
    await buySell('postBuyOrder', {
      sellToken,
      buyToken,
      amount: parseInt(amountString)
    })
  } else if (commander.sell) {
    // sell
    const [sellToken, buyToken, amountString] = commander.sell
    await buySell('postSellOrder', {
      sellToken,
      buyToken,
      amount: parseInt(amountString)
    })
  } else {
    // help
    commander.help()
  }
}
