const cliUtils = require('../helpers/cliUtils')

const getAddress = require('../../helpers/getAddress')
const getArbitrageService = require('../../services/ArbitrageService')
const getEthereumRepo = require('../../repositories/EthereumRepo')

function registerCommand ({ cli, logger }) {
  cli.command(
    'arbTransferToken <amount> <token>',
    'Transfer Arbitrage contract token balance to contract owner',
    yargs => {
      cliUtils.addPositionalByName('amount', yargs)
      cliUtils.addPositionalByName('token', yargs)
    }, async function (argv) {
      const { amount, token } = argv
      const DEFAULT_ACCOUNT_INDEX = 0
      const [
        from,
        arbitrageService,
        ethereumRepo
      ] = await Promise.all([
        getAddress(DEFAULT_ACCOUNT_INDEX),
        getArbitrageService(),
        getEthereumRepo()
      ])

      const token_balance = await ethereumRepo.tokenBalanceOf({
        tokenAddress: token,
        account: arbitrageService.getAddress()
      })

      if (token_balance.eq(0)) {
        logger.error('Can\'t transfer token (%s) balance of 0 from arbitrage contract', token)
        return
      }

      // TODO: check token decimals
      if (amount.eq(0) || amount.gt(token_balance)) {
        amount = token_balance / 1e18
      }

      logger.info(`Transfer %d token (%s) from Arbitrage contract to owner account %s`,
      amount,
      token,
      from
      )
      const transferTokenResult = await arbitrageService.transferToken({
        token,
        amount: amount * 1e18,
        from
      })
      logger.info('The transferToken tx was succesful. Transaction: %s', transferTokenResult.tx)
    })
}

module.exports = registerCommand
