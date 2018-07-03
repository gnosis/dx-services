const cliUtils = require('../helpers/cliUtils')
const formatUtil = require('../../helpers/formatUtil')

function registerCommand ({ cli, instances, logger }) {
  cli.command(
    'balances',
    'Get the balances for all known tokens for a given account. If no account selected mnemonic account is used (i.e. )',
    yargs => {
      cliUtils.addOptionByName({ name: 'account', yargs })
      yargs.option('verbose', {
        type: 'boolean',
        alias: 'v',
        describe: 'Extra info about tokens is showed'
      })
    }, async function (argv) {
      let { account, verbose } = argv

      const {
        botAccount,
        dxInfoService,
        contracts
      } = instances

      if (!account) {
        account = botAccount
      }

      logger.info(`\n**********  Balance for ${account}  **********\n`)
      const balanceETH = await dxInfoService.getBalanceOfEther({ account })
      logger.info('\tACCOUNT: %s', account)
      logger.info('\tBALANCE: %d ETH', formatUtil.formatFromWei(balanceETH))

      const [ tokenList, magnoliaToken ] = await Promise.all([
        dxInfoService.getTokenList(),
        dxInfoService.getMagnoliaToken()
      ])

      const tokens = tokenList.data
      tokens.push(magnoliaToken)

      const balances = await Promise.all(
        tokens.map(async ({ address: tokenAddress, symbol }) => {
          return Promise
            .all([
              // get token balance
              dxInfoService.getAccountBalanceForTokenNotDeposited({ tokenAddress, account }),
              dxInfoService.getTokenAllowance({
                tokenAddress,
                owner: account,
                spender: contracts.dx.address
              }),
              dxInfoService.getTokenTotalSupply({ tokenAddress }),
              // get token balance in DX
              dxInfoService.getAccountBalanceForToken({ token: symbol, address: account })
            ])
            .then(async ([ amount, allowance, totalSupply, amountInDx ]) => {
              const priceUsdInDx = await dxInfoService
                .getPriceInUSD({
                  token: symbol, amount: amountInDx
                })
                .then(price => price.toFixed(2))
                .catch(() => null)

              const priceUsd = await dxInfoService
                .getPriceInUSD({ token: symbol, amount })
                .then(price => price.toFixed(2))
                .catch(() => null)

              return {
                tokenAddress,
                token: symbol,
                amount,
                allowance,
                totalSupply,
                amountInDx,
                priceUsdInDx,
                priceUsd
              }
            })
        }))

      balances.forEach(balance => {
        logger.info('\n\tBalances %s (%s):', balance.token, balance.tokenAddress)
        logger.info(
          '\t\t- Balance in DX: %s%s',
          formatUtil.formatFromWei(balance.amountInDx),
          (balance.amountInDx.greaterThan(0) && balance.priceUsdInDx) ? ` (${balance.priceUsdInDx} USD)` : ''
        )
        logger.info(
          '\t\t- Balance of user: %s%s',
          formatUtil.formatFromWei(balance.amount),
          (balance.amount.greaterThan(0) && balance.priceUsd) ? ` (${balance.priceUsd} USD)` : ''
        )

        if (verbose) {
          logger.info('\t\t- Approved for DX: ' + formatUtil.formatFromWei(balance.allowance))
          logger.info('\t\t- Token Supply: ' + formatUtil.formatFromWei(balance.totalSupply))
          // console.log('\t\t- Token address: ' + balance.tokenAddress)
        }
      })
      logger.info('\n**************************************\n\n')
    })
}

module.exports = registerCommand
