const cliUtils = require('../helpers/cliUtils')
const getDateRangeFromParams = require('../../helpers/getDateRangeFromParams')
const formatUtil = require('../../helpers/formatUtil')

var fs = require('fs')

function registerCommand ({ cli, instances, logger }) {
  cli.command(
    'operations <period>',
    'Get all the operations performed in a time period (i.e. operations yesterday)',
    yargs => {
      cliUtils.getPositionalByName('period', yargs)
    }, async function (argv) {
      const { period } = argv

      // TODO: This command, is use for early testing, but it will be shaped into
      // a command that would allow to filter by dates, addresse, token, ..
      // Right now it filters by the bot address and use the defined time period
      const {
        dxInfoService,
        botAccount
      } = instances

      var stream = fs.createWriteStream('operations.csv')
      stream.write(`\
Trade date\t\
Operation\t\
Sell token\t\
Buy token\t\
Auction Index\t\
User\t\
Amount
`)

      // TODO: Move this logic to a service
      const { fromDate, toDate } = getDateRangeFromParams({ period })
      const operations = await dxInfoService.getOperations({
        fromDate,
        toDate,
        account: botAccount
      })
      operations.forEach(({
        type,
        auctionIndex,
        sellToken,
        buyToken,
        user,
        amount,
        dateTime
      }) => {
        const dateTimeStr = formatUtil.formatDateTime(dateTime)
        stream.write(`\
${dateTimeStr}\t\
${type}\t\
${sellToken.symbol}\t\
${buyToken.symbol}\t\
${auctionIndex}\t\
${user}\t\
${amount.div(1e18)}
`)
      })

      stream.end()
    })
}

module.exports = registerCommand
