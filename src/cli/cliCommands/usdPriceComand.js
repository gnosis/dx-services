const cliUtils = require('../helpers/cliUtils')
const numberUtil = require('../../helpers/numberUtil')

function registerCommand ({ cli, instances, logger }) {
  cli.command(
    'usd-price <amount> <token>',
    'Get the price of the specified amounts of a token in USD',
    yargs => {
      cliUtils.addPositionalByName('amount', yargs)
      cliUtils.addPositionalByName('token', yargs)
    }, async function (argv) {
      const { token, amount } = argv
      const {
        dxInfoService
      } = instances

      logger.info(`Get the price of ${amount} ${token} in USD`)

      const price = await dxInfoService.getPriceInUSD({
        token,
        amount: amount * 1e18
      })
      logger.info('The current price is: %s USD',
        numberUtil.round(price)
      )
    })
}

module.exports = registerCommand
