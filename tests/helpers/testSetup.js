const instanceFactory = require('../../src/helpers/instanceFactory')
const contractNames = [
  'DutchExchange',
  'TokenOWL',
  'TokenTUL',
  'TokenGNO',
  'EtherToken'
]

const config = {
  AUCTION_REPO_IMPL: 'ethereum'
}

const stateInfoProps = ['auctionIndex', 'auctionStart']
const auctionProps = [
  'buyVolume',
  'sellVolume',
  'closingPrice',
  'isClosed',
  'isTheoreticalClosed'
]

function getHelpers ({ ethereumClient, auctionRepo }) {
  const address = ethereumClient.getCoinbase()

  // helpers
  async function buySell (operation, { buyToken, sellToken, amount }) {
    // buy
    const auctionIndex = await auctionRepo.getAuctionIndex({
      buyToken,
      sellToken
    })
    console.log(`Token:\n\t${sellToken}-${buyToken}. Auction: ${auctionIndex}`)
    console.log(`Auction:\n\t${auctionIndex}`)
    await printState('State before buy', { buyToken, sellToken })

    await auctionRepo[operation]({
      address,
      buyToken,
      sellToken,
      auctionIndex,
      amount
    })
    console.log(`Succesfull "${operation}" of ${amount} tokens. SellToken: ${sellToken}, BuyToken: ${buyToken} `)
    await printState('State after buy', { buyToken, sellToken })
  }

  async function printTime (message) {
    const time = await ethereumClient.geLastBlockTime()
    console.log(message + ':\t', time.toUTCString())
  }

  async function printState (message, { sellToken, buyToken }) {
    const isSellTokenApproved = await auctionRepo.isApprovedToken({ token: sellToken })
    const isBuyTokenApproved = await auctionRepo.isApprovedToken({ token: buyToken })
    console.log(`\n**********  ${message}  **********\n`)

    if (!isSellTokenApproved || !isBuyTokenApproved) {
      console.log(`\tState: At least one of the tokens is not yet approved`)
      console.log('\n\tState info:')
      console.log('\n\t\tIs %s approved? %s', sellToken, printBoolean(isSellTokenApproved))
      console.log('\n\t\tIs %s approved? %s', buyToken, printBoolean(isBuyTokenApproved))
    } else {
      const state = await auctionRepo.getState({ sellToken, buyToken })
      const stateInfo = await auctionRepo.getStateInfo({ sellToken, buyToken })

      console.log(`\tState: ${state}`)

      console.log('\n\tState info:')
      printProps('\t\t', stateInfoProps, stateInfo)

      console.log(`\n\tAuction ${sellToken}-${buyToken}:`)
      printProps('\t\t', auctionProps, stateInfo.auction, formatters)

      console.log(`\n\tAuction ${buyToken}-${sellToken}:`)
      printProps('\t\t', auctionProps, stateInfo.auctionOpp, formatters)
    }
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

  return {
    // debug utils
    printProps,
    fractionFormatter,

    // interact with DX
    printTime,
    printState,
    addTokens,
    buySell
  }
}
function printProps (prefix, props, object, formatters) {
  props.forEach(prop => {
    let value = object[prop]
    if (formatters && formatters[prop]) {
      value = formatters[prop](value)
    }

    console.log(`${prefix}${prop}: ${value}`)
  })
}

function fractionFormatter (fraction) {
  if (fraction.numerator.isZero() && fraction.denominator.isZero()) {
    return null // fraction.numerator.toNumber()
  } else {
    return fraction
      .numerator
      .div(fraction.denominator)
      .toNumber()
  }
}

function printBoolean (flag) {
  return flag ? 'Yes' : 'No'
}

const formatters = {
  closingPrice: fractionFormatter
}

function testSetup () {
  return instanceFactory({ test: true, config })
    .then(instances => {
      return instances.ethereumClient
        .loadContracts({ contractNames })
        .then(contracts => {
          const helpers = getHelpers(instances)

          // Return contracts plus the test instances of the instance factory
          return Object.assign({}, helpers, contracts, instances)
        })
    })
}

module.exports = testSetup
