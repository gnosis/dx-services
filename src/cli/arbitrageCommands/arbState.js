const cliUtils = require('../helpers/cliUtils')

const getArbitrageService = require('../../services/ArbitrageService')

function registerCommand ({ cli, logger }) {
  cli.command(
    'state <token>',
    'Check the state of the Arbitrage opportunity',
    yargs => {
      cliUtils.addPositionalByName('token', yargs)
    }, async function (argv) {
      const { token } = argv
      const arbitrageService = await getArbitrageService()

      const { etherPerToken, tokenPerEther } = await arbitrageService.getUniswapExactPrice({ token })
      logger.info('The Uniswap exact price is %s Eth/Token and %s Token/Eth', etherPerToken, tokenPerEther)
    })
}

module.exports = registerCommand
