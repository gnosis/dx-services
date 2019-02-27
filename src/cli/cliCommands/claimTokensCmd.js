const cliUtils = require('../helpers/cliUtils')

const getAddress = require('../../helpers/getAddress')
const getDxTradeService = require('../../services/DxTradeService')

function registerCommand ({ cli, logger }) {
  cli.command('claim-tokens <token-pairs> [count]', 'Claim tokens for N auctions of a token pair (i.e. claim-tokens WETH-RDN)', yargs => {
    cliUtils.addPositionalByName('token-pairs', yargs)
    cliUtils.addPositionalByName('count', yargs)
  }, async function (argv) {
    const { tokenPairs: tokenPairString, count } = argv
    const tokenPairs = cliUtils.toTokenPairs(tokenPairString)

    const DEFAULT_ACCOUNT_INDEX = 0
    const [
      botAccount,
      dxTradeService
    ] = await Promise.all([
      getAddress(DEFAULT_ACCOUNT_INDEX),
      getDxTradeService()
    ])

    logger.info('Claiming last %d auctions for %s:',
      count, botAccount)
    const {
      claimAmounts,
      claimSellerTransactionResult,
      claimBuyerTransactionResult
    } = await dxTradeService.claimAll({
      tokenPairs, address: botAccount, lastNAuctions: count
    })
    claimSellerTransactionResult.tx
      ? logger.info('The seller claim was succesful. Transaction: %s', claimSellerTransactionResult.tx)
      : logger.info('No tokens to claim as seller for %s', tokenPairString)
    claimBuyerTransactionResult.tx
      ? logger.info('The buyer claim was succesful. Transaction: %s', claimBuyerTransactionResult.tx)
      : logger.info('No tokens to claim as buyer for %s', tokenPairString)

    claimAmounts.forEach(amount => {
      if (amount) {
        const { tokenA, tokenB, totalSellerClaims, totalBuyerClaims } = amount
        const tokenPairString = tokenA + '-' + tokenB

        const message = 'The bot claimed for ' + tokenPairString + ': ' +
          totalSellerClaims + ' tokens as seller, ' +
          totalBuyerClaims + ' tokens as buyer'

        // Log message
        logger.info(message)
      }
    })
  })
}

module.exports = registerCommand
