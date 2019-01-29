const loggerNamespace = 'dx-service:repositories:AuctionRepoImpl'
const Logger = require('../../helpers/Logger')
const logger = new Logger(loggerNamespace)
const Cacheable = require('../../helpers/Cacheable')
const assert = require('assert')

class ArbitrageRepoImpl extends Cacheable {
  constructor ({
    ethereumRepo,
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

    this._ethereumRepo = ethereumRepo
    this._ethereumClient = ethereumClient
    this._defaultGas = defaultGas
    this._transactionRetryTime = transactionRetryTime
    this._gasRetryIncrement = gasRetryIncrement
    this._overFastPriceFactor = overFastPriceFactor
    this._gasEstimationCorrectionFactor = gasEstimationCorrectionFactor
    this._gasPriceDefault = gasPriceDefault
    this._BLOCKS_MINED_IN_24H = ethereumClient.toBlocksFromSecondsEst(24 * 60 * 60)

    // Contracts
    this._dx = contracts.dx
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

  async getEthToTokenInputPrice (token, amount) {
    let uniswapExchangeAddress = await this._uniswapFactory.getExchange.call(token)
    let uniswapExchangeInstance = await this.getUniswapExchange(uniswapExchangeAddress)
    return uniswapExchangeInstance.getEthToTokenInputPrice(amount)
  }

  async getTokenToEthInputPrice (token, amount) {
    let uniswapExchangeAddress = await this._uniswapFactory.getExchange.call(token)
    let uniswapExchangeInstance = await this.getUniswapExchange(uniswapExchangeAddress)
    return uniswapExchangeInstance.getTokenToEthInputPrice(amount)
  }

  whichTokenIsEth (tokenA, tokenB) {
    assert(
      tokenB.toLowerCase() === this._tokens.WETH.address.toLowerCase() ||
      tokenA.toLowerCase() === this._tokens.WETH.address.toLowerCase() ||
      tokenB === 'WETH' ||
      tokenA === 'WETH'
      ,
      'Not prepared to do ERC20 to ERC20 arbitrage ')

    const etherTokenAddress = this._tokens.WETH.address
    let etherToken, tokenToken, tokenTokenAddress
    if (tokenB === 'WETH' || tokenA === 'WETH') {
      etherToken = tokenA === 'WETH' ? tokenA : tokenB
      tokenToken = etherToken === tokenA ? tokenB : tokenA
      tokenTokenAddress = this._tokens[tokenToken].address
    } else {
      etherToken = tokenA.toLowerCase() === this._tokens.WETH.address.toLowerCase() ? tokenA : tokenB
      tokenToken = etherToken === tokenA ? tokenB : tokenA
      tokenTokenAddress = tokenToken
    }
    return { etherToken, tokenToken, etherTokenAddress, tokenTokenAddress }
  }

  async getUniswapBalances ({ buyToken, sellToken }) {
    const { etherToken, tokenTokenAddress } = this.whichTokenIsEth(buyToken, sellToken)
    let uniswapExchangeAddress = await this._uniswapFactory.getExchange.call(tokenTokenAddress)
    const ether_balance = await this._ethereumClient.balanceOf(uniswapExchangeAddress)
    const token_balance = await this._ethereumRepo.tokenBalanceOf({
      tokenAddress: tokenTokenAddress,
      account: uniswapExchangeAddress
    })
    // buyerToken is exchanged for sellerToken, sellerToken is inputToken, buyerToken is outputToken

    if (buyToken.toLowerCase() === etherToken.toLowerCase()) {
      // if buyerToken is etherToken
      // then sellerToken is tokenToken... so tokenToken is used as inputToken
      // that will be exchanged for etherToken outputToken
      return {
        input_balance: token_balance,
        output_balance: ether_balance
      }
    } else {
      return {
        input_balance: ether_balance,
        output_balance: token_balance
      }
    }
  }

  async dutchOpportunity ({ arbToken, amount, from }) {
    return this._doTransaction({
      operation: 'dutchOpportunity',
      from,
      params: [arbToken, amount]
    })
  }
  async uniswapOpportunity ({ arbToken, amount, from }) {
    return this._doTransaction({
      operation: 'uniswapOpportunity',
      from,
      params: [arbToken, amount]
    })
  }

  async getOwner () {
    return this._doCall({
      operation: 'owner'
    })
  }

  async depositEther ({ amount, from }) {
    return this._doTransaction({
      operation: 'depositEther',
      from,
      value: amount
    })
  }

  async _doCall ({
    operation,
    params,
    cacheTime = this._cacheTimeShort
  }) {
    // NOTE: cacheTime can be set null/0 on porpouse, so it's handled from the
    //  caller method
    params = params || []
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
    params = params || []
    logger.info({
      msg: '_doTransaction: \n%O',
      params: [
        operation,
        from,
        params,
        value
      ]
    })

    let gasPricePromise = this._getGasPrices(gasPriceParam)

    await this._arbitrage[operation].call(...params, { from, value })

    const [ gasPrices, estimatedGas ] = await Promise.all([
      // Get gasPrice
      gasPricePromise,

      // Estimate gas
      this._arbitrage[operation]
        .estimateGas(...params, { from, value })
    ])

    const { initialGasPrice, fastGasPrice } = gasPrices

    logger.info({
      msg: '_doTransaction. Estimated gas for "%s": %d',
      params: [ operation, estimatedGas ]
    })
    logger.info({
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

module.exports = ArbitrageRepoImpl
