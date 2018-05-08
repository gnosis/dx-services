const cliUtils = require('../helpers/cliUtils')
const getDateRangeFromParams = require('../../helpers/getDateRangeFromParams')
const formatUtil = require('../../helpers/formatUtil')

function registerCommand ({ cli, instances, logger }) {
  cli.command(
    'trades',
    'Get all the operations performed in a time period. It requires either the params "from-date" and "to-date" or the "period" param',
    yargs => {
      cliUtils.addOptionByName({ name: 'from-date', yargs })
      cliUtils.addOptionByName({ name: 'to-date', yargs })
      cliUtils.addOptionByName({ name: 'period', yargs })

      yargs.option('token', {
        type: 'string',
        describe: 'The token symbol or address that is being bought or sold, i.e. RDN'
      })
      yargs.option('type', {
        type: 'string',
        describe: 'trade type. Can be "bid" or "ask"'
      })
      cliUtils.addOptionByName({ name: 'sell-token', yargs })
      cliUtils.addOptionByName({ name: 'buy-token', yargs })
      cliUtils.addOptionByName({ name: 'auction-index', yargs })
      cliUtils.addOptionByName({ name: 'account', yargs })
    }, async function (argv) {
      const { fromDate: fromDateStr, toDate: toDateStr, period, token, type, sellToken, buyToken, auctionIndex, account } = argv

      // TODO: This command, is use for early testing, but it will be shaped into
      // a command that would allow to filter by dates, addresse, token, ..
      // Right now it filters by the bot address and use the defined time period
      const {
        dxInfoService
      } = instances

      const { fromDate, toDate } = getDateRangeFromParams({
        period, fromDateStr, toDateStr
      })

      logger.info('Find all trades, between %s and %s',
        formatUtil.formatDateTime(fromDate),
        formatUtil.formatDateTime(toDate)
      )

      let aditionalFilter = false
      if (type) {
        aditionalFilter = true
        logger.info('\t Filter by type: %s', type)
      }
      if (account) {
        aditionalFilter = true
        logger.info('\t Filter by account: %s', account)
      }
      if (token) {
        aditionalFilter = true
        logger.info('\t Filter by token: %s', token)
      }
      if (sellToken) {
        aditionalFilter = true
        logger.info('\t Filter by sellToken: %s', sellToken)
      }
      if (buyToken) {
        aditionalFilter = true
        logger.info('\t Filter by buyToken: %s', buyToken)
      }
      if (auctionIndex) {
        aditionalFilter = true
        logger.info('\t Filter by auctionIndex: %s', auctionIndex)
      }

      if (!aditionalFilter) {
        logger.info('\t Not aditional filters were applied')
      }

      const operations = await dxInfoService.getOperations({
        fromDate,
        toDate,
        type,
        account,
        token,
        sellToken,
        buyToken,
        auctionIndex
      })
      if (operations.length > 0) {
        logger.info('Found %d matching trades:', operations.length)
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
          logger.info(`\t${sellToken.symbol}-${buyToken.symbol}-${auctionIndex}: ${user} ${type} ${amount.div(1e18)} at ${dateTimeStr}`)
        })
      } else {
        logger.info('There are no trades that matches the search criteria.')
      }
    })
}

module.exports = registerCommand
