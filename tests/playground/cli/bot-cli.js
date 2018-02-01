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

  async function addTokens () {
    await auctionRepo.addTokenPair({
      address,
      tokenA: 'RDN',
      tokenAFunding: 0,
      tokenB: 'ETH',
      tokenBFunding: 15.123,
      initialClosingPrice: {
        numerator: 330027,
        denominator: 100000000
      }
    })

    console.log('The tokens were succesfully added')

    /*
    await auctionRepo.addTokenPair({
      address,
      tokenA: 'OMG',
      tokenAFunding: 0,
      tokenB: 'ETH',
      tokenBFunding: 20.123,
      initialClosingPrice: {
        numerator: 1279820,
        denominator: 100000000
      }
    })
    */
  }

  async function buySell (operation, { buyToken, sellToken, amount }) {
    // buy
    const auctionIndex = await auctionRepo.getAuctionIndex({
      buyToken,
      sellToken
    })
    console.log(`Token:\n\t${sellToken}-${buyToken}. Auction: ${auctionIndex}`)
    console.log(`Auction:\n\t${auctionIndex}`)
    await printState('State before buy', { buyToken, sellToken})

    await auctionRepo[operation]({
      address,
      buyToken,
      sellToken,
      auctionIndex,
      amount
    })
    console.log(`Succesfull "${operation}" of ${amount} tokens. SellToken: ${sellToken}, BuyToken: ${buyToken} `)
    await printState('State after buy', { buyToken, sellToken})
  }

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

  commander.on('--help', function(){
    console.log('\n\nExamples:');
    console.log('');
    console.log('\tbot-cli -n');
    console.log('\tbot-cli --state RDN,ETH')
    console.log('\tbot-cli --add-tokens')
    console.log('\tbot-cli --closing-price RDN,ETH,0');
    console.log('\tbot-cli --oracle ETH');
    console.log('\tbot-cli --mine');
    console.log('\tbot-cli --time 0.5');
    console.log('\tbot-cli --time 6');
    console.log('\tbot-cli --buy RDN,ETH,100');
    console.log('\tbot-cli --sell ETH,RDN,100');
    console.log('');
  })

  commander.parse(process.argv)

  if (commander.now) {
    // now
    await printTime('Current time')

  } else if (commander.state) {
    // State
    const [buyToken, sellToken] = commander.state
    printState('State', { buyToken, sellToken})

  } else if (commander.addTokens) {
    // add tokens
    await printState('State before add tokens', { buyToken: 'RDN', sellToken: 'ETH'})
    await addTokens()
    await printState('State after add tokens', { buyToken: 'RDN', sellToken: 'ETH'})

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
