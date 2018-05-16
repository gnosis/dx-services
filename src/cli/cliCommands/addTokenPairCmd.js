const cliUtils = require('../helpers/cliUtils')
const PAIRS_DATA_ROUTE = '../../../tests/data/tokenPairs'

function registerCommand ({ cli, instances, logger }) {
  cli.command('add-token-pair', 'Add a new token pair from a given account', yargs => {
    yargs.option('token-pair', {
      type: 'string',
      describe: 'The token pair symbols, i.e. RDN-WETH'
    })
  }, async function (argv) {
    const { tokenPair } = argv

    const {
      botAccount: account,
      dxManagementService
    } = instances

    if (tokenPair) {
      const [ tokenA, tokenB ] = tokenPair.split('-')
    } else {
      const allPairs = require(PAIRS_DATA_ROUTE + '/local/allPairs.js')

      allPairs.forEach(async ({ tokenA, tokenB, initialPrice }) => {
        logger.info('Adding a new token pair %s, funding %s with %d and %s with %d, with an initial price of %O using account %s',
          tokenPair, tokenA.address, tokenA.funding, tokenB.address, tokenB.funding, initialPrice, account)

        const result = await _addTokenPair(dxManagementService, {
          from: account, tokenA, tokenB, initialPrice
        })

        logger.info('Successfully added the token pair. Transaction : %s', result.tx)
      })
    }
  })
}

async function _addTokenPair (dxManagementService, { from, tokenA, tokenB, initialPrice }) {
  return dxManagementService.addTokenPair({
    from,
    tokenA: tokenA.address,
    tokenAFunding: tokenA.funding * 1e18,
    tokenB: tokenB.address,
    tokenBFunding: tokenB.funding * 1e18,
    initialClosingPrice: initialPrice
  })
}

module.exports = registerCommand
