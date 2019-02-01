const loggerNamespace = 'dx-service:repositories:AuctionRepoImpl'
const Logger = require('../../helpers/Logger')
const logger = new Logger(loggerNamespace)
const AuctionLogger = require('../../helpers/AuctionLogger')
const ethereumEventHelper = require('../../helpers/ethereumEventHelper')
const dxFilters = require('../../helpers/dxFilters')
const auctionLogger = new AuctionLogger(loggerNamespace)
const Cacheable = require('../../helpers/Cacheable')
// const sendTxWithUniqueNonce = require('../../helpers/sendTxWithUniqueNonce')

const HEXADECIMAL_REGEX = /0[xX][0-9a-fA-F]+/

const assert = require('assert')

const AUCTION_START_FOR_WAITING_FOR_FUNDING = 1
const MAXIMUM_FUNDING = 10 ** 30

const BigNumber = require('bignumber.js')
const numberUtil = require('../../helpers/numberUtil.js')

const environment = process.env.NODE_ENV
const isLocal = environment === 'local'

class ArbitrageRepoImpl extends Cacheable {
  constructor ({
    ethereumClient,
    contracts,
    // Cache
    cacheConf,
    // Gas
    defaultGas = 6700000,
    gasPriceDefault = 'fast', // safeLow, average, fast
    // Retry
    transactionRetryTime = 5 * 60 * 1000, // 5 minutes,
    gasRetryIncrement = 1.2,
    overFastPriceFactor = 1,
    gasEstimationCorrectionFactor = 2
  }) {
    super({
      cacheConf,
      cacheName: 'ArbitrageRepo'
    })
    assert(ethereumClient, '"ethereumClient" is required')
    assert(contracts, '"contracts" is required')

    this._ethereumClient = ethereumClient
    this._defaultGas = defaultGas
    this._transactionRetryTime = transactionRetryTime
    this._gasRetryIncrement = gasRetryIncrement
    this._overFastPriceFactor = overFastPriceFactor
    this._gasEstimationCorrectionFactor = gasEstimationCorrectionFactor
    this._gasPriceDefault = gasPriceDefault
    this._BLOCKS_MINED_IN_24H = ethereumClient.toBlocksFromSecondsEst(24 * 60 * 60)

    // Contracts
    this._arbitrage = contracts.arbitrageContract
    this._uniswapFactory = contracts.uniswapFactory
    this._uniswapExchange = contracts.uniswapExchange
    this._tokens = Object.assign({
      GNO: contracts.gno,
      WETH: contracts.eth,
      MGN: contracts.mgn,
      OWL: contracts.owl
    }, contracts.erc20TokenContracts)

    logger.debug({
      msg: `Arbitrage contract in address %s`,
      params: [ this._arbitrage.address ]
    })
    logger.debug({
      msg: `Price Oracle in address %s`,
      params: [ this._priceOracle.address ]
    })

    this.ready = Promise.resolve()
    Object.keys(this._tokens).forEach(token => {
      const contract = this._tokens[token]
      logger.debug({
        msg: `Token %s in address %s`,
        params: [ token, contract.address ]
      })
    })
  }

  getArbitrageAddress () {
    return this._arbitrage.address
  }

  async getUniswapExchange (uniswapExchangeAddress) {
    const uniswapExchangeInstance = this._uniswapExchange.at(uniswapExchangeAddress)
    return uniswapExchangeInstance
  }

  whichTokenIsEth(tokenA, tokenB) {
    assert(tokenB.toLowerCase() === this._tokens.WETH.toLowerCase() || tokenA.toLowerCase() === this._tokens.WETH.toLowerCase(),
    "Not prepared to do ERC20 to ERC20 arbitrage")

    etherToken = tokenA.toLowerCase() === this._tokens.WETH.address.toLowerCase() ? tokenA : tokenB
    tokenToken = etherToken === tokenA ? tokenB : tokenA
    return {etherToken, tokenToken}
  }

  async getUniswapBalances({buyToken, sellToken}) {
    const {tokenToken} = this._arbitrageRepo.whichTokenIsEth(buyToken, sellToken)        

    const uniswapExchangeAddress = await this._uniswapFactory.getExchange(tokenToken)
    ether_balance = this._ethereumClient.balanceOf(uniswapExchangeAddress)
    token_balance = this._ethereumClient.tokenBalanceOf({
      tokenAddress: tokenToken,
      account: uniswapExchangeAddress
    })

    // if (sellToken === etherToken) {
    //   input_balance = token_balance
    //   output_balance = ether_balance
    //   buyOnDutch = true
    // } else {
    //   input_balance = ether_balance
    //   output_balance = token_balance
    //   buyOnDutch = false
    // }
    return {
      // buyOnDutch,
      // input_balance,
      // output_balance,
      // etherToken,
      // uniswapExchangeAddress,
      ether_balance,
      token_balance
    }
  }

  async dutchOpportunity({buyToken, amount, from}) {
    let etherBalanceBefore

    try {
      await this._doTransaction({
        operation: 'dutchOpportunity',
        from,
        params: [buyToken, amount]
      })

      let etherBalanceAfter;
    } catch(error) {
      return false
    }
  }


  async uniswapOpportunity({sellToken, amount, from}) {
    return this._doTransaction({
      operation: 'uniswapOpportunity',
      from,
      params: [sellToken, amount]
    })
  }

  async depositEther({amount, from}) {
    return this._doTransaction({
      operation: 'depositEther',
      from,
      amount
    })
  }

  // async getAbout () {
  //   const auctioneerAddress = await this._arbitrage.auctioneer.call()
  //   const tokenNames = Object.keys(this._tokens)

  //   return {
  //     auctioneer: auctioneerAddress,
  //     dxAddress: this._dx.address,
  //     priceOracleAddress: this._priceOracle.address,
  //     tokens: tokenNames.map(name => ({
  //       name,
  //       address: this._tokens[name].address
  //     }))
  //   }
  // }

  async _doCall ({
    operation,
    params,
    cacheTime = this._cacheTimeShort
  }) {
    // NOTE: cacheTime can be set null/0 on porpouse, so it's handled from the
    //  caller method

    logger.debug('Transaction: ' + operation, params)
    if (this._cache && cacheTime !== null) {
      const cacheKey = this._getCacheKey({ operation, params })
      return this._cache.get({
        key: cacheKey,
        time: cacheTime, // Caching time in seconds
        fetchFn: () => {
          return this._fetchFromBlockchain({ operation, params })
        }
      })
    } else {
      return this._fetchFromBlockchain({ operation, params })
    }
  }

  _fetchFromBlockchain ({ operation, params }) {
    logger.debug('Fetching from blockchain: ' + operation, params)
    return this._arbitrage[operation]
      .call(...params)
      .catch(e => {
        logger.error({
          msg: 'ERROR: Call %s with params: [%s]',
          params: [ operation, params.join(', ') ],
          e
        })
        throw e
      })
  }

  _getCacheKey ({ operation, params }) {
    return operation + ':' + params.join('-')
  }

  async _doTransaction ({ operation, from, gasPrice: gasPriceParam, params, value }) {
    value = value || '0'
    logger.debug({
      msg: '_doTransaction: %o',
      params: [
        operation,
        from,
        params,
        value
      ]
    })

    let gasPricePromise = this._getGasPrices(gasPriceParam)

    const [ gasPrices, estimatedGas ] = await Promise.all([
      // Get gasPrice
      gasPricePromise,

      // Estimate gas
      this._arbitrage[operation]
        .estimateGas(...params, { from, value })
    ])

    const { initialGasPrice, fastGasPrice } = gasPrices

    logger.debug({
      msg: '_doTransaction. Estimated gas for "%s": %d',
      params: [ operation, estimatedGas ]
    })
    logger.debug({
      msg: 'Initial gas price is set to %d by %s',
      params: [ initialGasPrice, this._gasPriceDefault ]
    })
    const gas = Math.ceil(estimatedGas * this._gasEstimationCorrectionFactor)
    const maxGasWillingToPay = fastGasPrice * this._overFastPriceFactor

    return new Promise((resolve, reject) => {
      // Do transaction, with no retry
      this._doTransactionWithoutRetry({
        resolve,
        reject,
        gasPrice: initialGasPrice,
        maxGasWillingToPay,
        operation,
        from,
        params,
        gas,
        gasPriceParam,
        nonce: undefined,
        value
      })
    })
  }

  async _getGasPrices (gasPriceParam) {
    if (gasPriceParam) {
      // Use the provided gas price
      return Promise.resolve({
        initialGasPrice: gasPriceParam,
        fastGasPrice: gasPriceParam
      })
    } else {
      // Get safe low gas price by default
      return this._ethereumClient
        .getGasPricesGWei()
        .then(gasPricesGWei => {
          return {
            initialGasPrice: gasPricesGWei[this._gasPriceDefault].mul(1e9),
            fastGasPrice: gasPricesGWei['fast'].mul(1e9)
          }
        })
    }
  }

  async _doTransactionWithoutRetry ({
    resolve,
    reject,
    gasPrice,
    maxGasWillingToPay,
    operation,
    from,
    params,
    gas,
    gasPriceParam, // if manually set
    nonce,
    value
  }) {
    return this
      ._arbitrage[operation](...params, {
        from,
        gas,
        gasPrice,
        value
      }).then(result => {
        resolve(result)
      }).catch(error => {
        logger.error({
          msg: 'Error on transaction "%s", from "%s". Params: [%s]. Gas: %d, GasPrice: %d. Value: %d. Error: %s',
          params: [ operation, from, params, gas, gasPrice, value, error ],
          error
        })

        reject(error)
      })
  }

}

function toFraction ([ numerator, denominator ]) {
  // the contract return 0/0 when something is undetermined
  if (numerator.isZero() && denominator.isZero()) {
    return null
  } else {
    return { numerator, denominator }
  }
}

module.exports = ArbitrageRepoImpl
