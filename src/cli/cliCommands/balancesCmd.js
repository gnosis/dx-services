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
        contracts,
        config
      } = instances

      if (!account) {
        account = botAccount
      }

      logger.info(`\n**********  Balance for ${account}  **********\n`)
      const balanceETH = await dxInfoService.getBalanceOfEther({ account })
      logger.info('\tACCOUNT: %s', account)
      logger.info('\tBALANCE: %d ETH', formatUtil.formatFromWei(balanceETH))

      // const [ tokenList, magnoliaToken ] = await Promise.all([
      //   dxInfoService.getTokenList(),
      //   dxInfoService.getMagnoliaToken()
      // ])
      // const tokens = tokenList.data
      // tokens.push(magnoliaToken)
      const tokens = Object.keys(config.ERC20_TOKEN_ADDRESSES).map(symbol => {
        return {
          symbol,
          tokenAddress: config.ERC20_TOKEN_ADDRESSES[symbol]
        }
      })

      // Add WETH to the ERC20 list to see balance as is an special token
      tokens.push({
        symbol: 'WETH',
        tokenAddress: await dxInfoService.getTokenAddress('WETH')
      })

      const balancePromises = tokens.map(token => _getBalance({
        account,
        token,
        dxInfoService,
        dxAddress: contracts.dx.address
      }))

      const balances = await Promise.all(balancePromises)
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

async function _getBalance ({
  token,
  dxInfoService,
  account,
  dxAddress
}) {
  const { tokenAddress, symbol } = token

  const {
    amount,
    allowance,
    totalSupply,
    amountInDx
  } = await _getBasicBalances({
    tokenAddress,
    symbol,
    account,
    dxInfoService,
    dxAddress
  })

  const { priceUsdInDx, priceUsd } = await _getUsdEstimation({
    amount,
    amountInDx,
    dxInfoService
  })

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
}

async function _getBasicBalances ({
  tokenAddress,
  symbol,
  account,
  dxInfoService,
  dxAddress
}) {
  // TODO: Create a service function that return the balance details so we don't
  // have to do so many service calls
  const [
    amount,
    allowance,
    totalSupply,
    amountInDx
  ] = await Promise.all([
    // get token balance
    dxInfoService.getAccountBalanceForTokenNotDeposited({ token: tokenAddress, account }),
    dxInfoService.getTokenAllowance({
      tokenAddress,
      owner: account,
      spender: dxAddress
    }),
    dxInfoService.getTokenTotalSupply({ tokenAddress }),
    // get token balance in DX
    dxInfoService.getAccountBalanceForToken({ token: symbol, address: account })
  ])

  return {
    amount,
    allowance,
    totalSupply,
    amountInDx
  }
}

async function _getUsdEstimation ({
  symbol,
  amountInDx,
  amount,
  dxInfoService
}) {
  const priceUsdInDxPromise = dxInfoService
    .getPriceInUSD({
      token: symbol, amount: amountInDx
    })
    .then(price => price.toFixed(2))
    .catch(() => null)

  const priceUsdPromise = dxInfoService
    .getPriceInUSD({ token: symbol, amount })
    .then(price => price.toFixed(2))
    .catch(() => null)

  const [ priceUsdInDx, priceUsd ] = await Promise.all([
    priceUsdInDxPromise,
    priceUsdPromise
  ])

  return {
    priceUsdInDx,
    priceUsd
  }
}

module.exports = registerCommand
