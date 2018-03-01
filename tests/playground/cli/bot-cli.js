#!/usr/bin/env node
const commander = require('commander')

const getVersion = require('../../../src/helpers/getVersion')
const testSetup = require('../../helpers/testSetup')
// const BigNumber = require('bignumber.js')
const BOT_CLI_SCRIPT = 'npm run cli --'

testSetup()
  .then(run)
  .catch(console.error)

function list (val) {
  return val.split(',')
}

async function run ({
  auctionRepo,
  ethereumClient,
  owner,
  user1,
  printProps,
  fractionFormatter,
  printTime,
  printState,
  printAddresses,
  printBalances,
  setupTestCases,
  addTokens,
  buySell,
  deposit,
  dx,
  dxMaster,
  web3
}) {
  commander
    .version(getVersion(), '-v, --version')
    .option('-n, --now', 'Show current time')
    .option('-a, --addresses', 'Addresses for main contracts and tokens')
    .option('-b, --balances', 'Balances for all known tokens')
    .option('-I, --setup', 'Basic setup for testing porpouses')
    .option('-A, --approve-token <token>', 'Approve token', list)
    .option('-x --state "<sell-token>,<buy-token>"', 'Show current state', list)
    .option('-D, --deposit "<token>,<amount>"', 'Deposit tokens (i.e. --deposit ETH,0.1)', list)
    .option('-z --add-tokens', 'Ads RDN-ETH') //  OMG-ETH and RDN-OMG
    .option('-k --closing-price "<sell-token>,<buy-token>,<auction-index>"', 'Show closing price', list)
    .option('-p --price "<sell-token>,<buy-token>,<auctionIndex>"', 'Show the closing price for an auction', list)
    .option('-o --oracle <token>', 'Show oracle-price')
    .option('-t, --time <hours>', 'Increase time of the blockchain in hours', parseFloat)
    .option('-m, --mine', 'Mine one block')
    .option('-B, --buy "<sell-token>,<buy-token>,<amount>"', 'Buy tokens in the <sell-token>-<buy-token> auction', list)
    .option('-S, --sell <sell-token> <buy-token> <amount>', 'Sell tokens <sell-token>-<buy-token> auction', list)

  commander.on('--help', function () {
    const examples = [
      '--now',
      '--addresses',
      '--balances',
      '--setup',
      '--approve-token RDN',
      '--state RDN,ETH',
      '--deposit ETH,100',
      '--add-tokens',
      '--closing-price RDN,ETH,0',
      '--price RDN,ETH,1',
      '--oracle ETH',
      '--mine',
      '--time 0.5',
      '--time 6',
      '--buy RDN,ETH,100',
      '--sell ETH,RDN,100'
    ]

    console.log('\n\nExamples:')
    examples.forEach(example => console.log('\t %s %s', BOT_CLI_SCRIPT, example))
    console.log('')
  })

  commander.parse(process.argv)

  if (commander.now) {
    // now
    await printTime('Current time')
  } else if (commander.addresses) {
    // Addresses
    await printAddresses()
  } else if (commander.balances) {
    // Balances
    await printBalances({ accountName: 'DX', account: dx.address, verbose: false })
    // await printBalances({ accountName: 'DX (master)', account: dxMaster.address, verbose: false })
    // await printBalances({ accountName: 'Owner', account: owner, verbose: false })
    await printBalances({ accountName: 'User 1', account: user1, verbose: true })
  } else if (commander.setup) {
    // Setup for testing
    await setupTestCases()
  } else if (commander.approveToken) {
    const token = commander.approveToken
    await auctionRepo.approveToken({ token, from: owner })
    console.log('The token %s has been approved', token)
  } else if (commander.state) {
    // State
    const [buyToken, sellToken] = commander.state
    await printState('State', { buyToken, sellToken })
  } else if (commander.deposit) {
    // deposit
    const [token, amountString] = commander.deposit
    // const amount = new BigNumber(amountString)
    const amount = parseFloat(amountString)

    await deposit({
      account: user1,
      token,
      amount
    })
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
  } else if (commander.price) {
    // Price
    const [sellToken, buyToken, auctionIndex] = commander.price
    const price = await auctionRepo.getPrice({ sellToken, buyToken, auctionIndex })
    console.log(`Price for ${sellToken}-${buyToken} (${auctionIndex}): ${fractionFormatter(price)}`)
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
    const [sellToken, buyToken, amountString] = commander.buy
    await buySell('postBuyOrder', {
      from: user1,
      sellToken,
      buyToken,
      amount: parseFloat(amountString)
    })
  } else if (commander.sell) {
    // sell
    const [sellToken, buyToken, amountString] = commander.sell
    await buySell('postSellOrder', {
      from: user1,
      sellToken,
      buyToken,
      amount: parseFloat(amountString)
    })
  } else {
    // help
    commander.help()
  }
}
