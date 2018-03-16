const loggerNamespace = 'dx-service:services:CliService'
const Logger = require('../helpers/Logger')
const logger = new Logger(loggerNamespace)
const assert = require('assert')

const numberUtil = require('../../src/helpers/numberUtil')

class CliService {
  constructor ({ auctionRepo, ethereumRepo, markets }) {
    this._auctionRepo = auctionRepo
    this._ethereumRepo = ethereumRepo
    this._markets = markets
  }

  async sendTokens ({ token, amount, fromAddress, toAddress }) {
    const amountInWei = numberUtil.toWei(amount)

    if (token === 'ETH') {
      // In case of the ETH, we make sure we have enough EtherTokens
      await this._depositEtherIfRequired({
        amountInWei,
        accountAddress: fromAddress
      })
    }

    const transactionResult = await this._auctionRepo.transferERC20Token({
      from: fromAddress,
      to: toAddress,
      token,
      amount: amountInWei
    })

    logger.info({
      msg: 'Transfered %d %s from %s to %s. Transaction: %s',
      params: [ amount, token, fromAddress, toAddress ]
    })

    return transactionResult.tx
  }

  async fundAccount ({ token, amount, accountAddress }) {
    // Get the account we want to fund
    // const accountAddress = await this._getAccountAddress(accountIndex)
    logger.info({
      msg: 'Fund the account %s with %d %s',
      params: [ accountAddress, amount, token ]
    })

    let transactionResult
    const amountInWei = numberUtil.toWei(amount)
    if (token === 'ETH') {
      // In case of the ETH, we make sure we have enough EtherTokens
      await this._depositEtherIfRequired({ amountInWei, accountAddress })
    }

    // Approce DX to use the tokens
    transactionResult = await this._auctionRepo.approveERC20Token({
      from: accountAddress,
      token,
      amount: amountInWei
    })
    logger.info({
      msg: 'Approved the DX to use %d %s on behalf of the user. Transaction: %s',
      params: [ amount, token, transactionResult.tx ]
    })

    // Deposit the tokens into the user account balance
    transactionResult = await this._auctionRepo.deposit({
      from: accountAddress,
      token,
      amount: amountInWei
    })
    logger.info({
      msg: 'Deposited %d %s into DX account balances for the user. Transaction: %s',
      params: [ amount, token, transactionResult.tx ]
    })

    return this._auctionRepo.getBalance({
      token,
      address: accountAddress
    })
  }


  async _depositEtherIfRequired ({ accountAddress, amountInWei }) {
    let transactionResult

    // Check if the user has already enogh EtherTokens
    const etherTokenBalance = await this._auctionRepo.getBalanceERC20Token({
      token: 'ETH',
      address: accountAddress
    })

    if (etherTokenBalance.lessThan(amountInWei)) {
      const missingDifferenceInWeis = amountInWei.minus(etherTokenBalance)
      logger.info({
        msg: `We don't have enogth EtherTokens, so we need to deposit: %d ETH`,
        params: [ missingDifferenceInWeis.div(1e18) ]
      })

      transactionResult = await this._auctionRepo.depositEther({
        from: accountAddress,
        amount: missingDifferenceInWeis
      })
      logger.info({
        msg: 'Wrapped %d ETH in a ERC20 ETH token. Transaction: %s',
        params: [ amountInWei.div(1e18), transactionResult.tx ]
      })
    }
  }

  async _getAccountAddress (accountIndex) {
    const accounts = await this._ethereumRepo.getAccounts(accountIndex)

    assert(accounts.length >= accountIndex - 1, `There should be at least \
${accountIndex} accounts, but there's just ${accounts}`)

    return accounts[accountIndex - 1]
  }

  // TODO: Bring and refactor the `testSetup` logic that the bot-cli uses
}

module.exports = CliService
