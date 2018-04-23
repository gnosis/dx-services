const debug = require('debug')('DEBUG-dx-service:tests:helpers:watchEthereumEvents')
const testSetup = require('../../helpers/testSetup')
const ethereumEventHelper = require('../../../src/helpers/ethereumEventHelper')

testSetup()
  .then(run)
  .catch(console.error)

function run ({
  dx,
  botAccount
}) {
  ethereumEventHelper
    .filter({
      contract: dx,
      events: [
        'NewSellOrder',
        'NewBuyOrder'
      ],
      fromBlock: 0,
      toBlock: 'latest',
      filters: {
        user: botAccount
      }
    })
    .then(events => {
      debug('%d events:', events.length)
      events.forEach(event => {
        const { event: eventName, blockNumber } = event
        const { sellToken, buyToken, auctionIndex, amount } = event.args

        debug(`\t[blockNumber=${blockNumber}] ${eventName}:
\t\t- Auction Index: ${auctionIndex}
\t\t- Token Pair: ${sellToken}-${buyToken}
\t\t- Amount: ${amount}\n`)
      })
    })
    .catch(console.error)
}
