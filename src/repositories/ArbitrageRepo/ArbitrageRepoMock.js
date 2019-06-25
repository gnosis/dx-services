const debug = require('debug')('DEBUG-dx-service:repositories:ArbitrageRepoMock')
debug.log = console.debug.bind(console)

const numberUtil = require('../../helpers/numberUtil')
const { ZERO, ONE, fromWei } = numberUtil

const auctionsMockData = require('../../../tests/data/auctions')
const arbitrageMockData = require('../../../tests/data/arbitrage')

class ArbitrageRepoMock {
  constructor ({
    auctions,
    balances,
    pricesInUSD,
    pricesInETH,
    uniswapBalances,
    tokenInfo
  }) {
    this._auctions = auctions || auctionsMockData.auctions
    this._balances = balances || auctionsMockData.balances
    this._pricesInUSD = pricesInUSD || auctionsMockData.pricesInUSD
    this._pricesInETH = pricesInETH || auctionsMockData.pricesInETH
    this._uniswapBalances = uniswapBalances || arbitrageMockData.uniswapBalances
    this._tokenInfo = tokenInfo || arbitrageMockData.tokenInfo
    this._tokens = { WETH: '', RDN: '', OMG: '' }
  }

  async getAbout () {
    debug('Get auction basic info')
    return {
      network: 'http://localhost:8545',
      ownerAddress: '0x424a46612794dbb8000194937834250Dc723fFa5',
      exchageAddress: '0x1223'
    }
  }

  async getUniswapExchange (uniswapExchangeAddress) {
    // const uniswapExchangeInstance = this._uniswapExchange.at(uniswapExchangeAddress)
    // return uniswapExchangeInstance
    return '0x'
  }

  async getUniswapBalances ({ sellToken, buyToken }) {
    let balances = {}
    if (this._uniswapBalances[sellToken + '-' + buyToken]) {
      balances = this._uniswapBalances[sellToken + '-' + buyToken]
    } else if (this._uniswapBalances[buyToken + '-' + sellToken]) {
      balances.inputBalance = this._uniswapBalances[buyToken + '-' + sellToken].outputBalance
      balances.outputBalance = this._uniswapBalances[buyToken + '-' + sellToken].inputBalance
    } else {

    }
    return Promise.resolve(balances)
  }

  async _getGasPrices (gasPriceParam) {
    return Promise.resolve({
      initialGasPrice: '5',
      fastGasPrice: '10'
    })
  }


  // getInputPrice (inputAmount, inputReserve, outputReserve) {
  //   assert(inputReserve.gt(0), 'Input reserve must be greater than 0')
  //   assert(outputReserve.gt(0), 'Output reserve must be greater than 0')
  //   const inputAmountWithFee = inputAmount.mul(numberUtil.ONE.minus(UNISWAP_FEE))
  //   const numerator = inputAmountWithFee.mul(outputReserve)
  //   const denominator = inputReserve.add(inputAmountWithFee)
  //   return numerator.div(denominator)
  // }

  async getTokenToEthInputPrice (token, amount) {
    const { decimals } = this._tokenInfo[token]
    let balances = {}
    if (this._uniswapBalances[token + '-WETH']) {
      balances = this._uniswapBalances[token + '-WETH']
    } else if (this._uniswapBalances['WETH-' + token]) {
      balances.inputBalance = this._uniswapBalances['WETH-' + token].outputBalance
      balances.outputBalance = this._uniswapBalances['WETH-' + token].inputBalance
    }

    const { inputBalance, outputBalance } = balances
    const returnedAmount = amount.mul(inputBalance.div(outputBalance))
      .mul(numberUtil.TEN.toPower(18 - decimals))
    return Promise.resolve(
      returnedAmount
    )
  }

  async dutchOpportunity ({ arbToken, amount, from, arbitrageContractAddress }) {
    return Promise.resolve({})
  }

  async uniswapOpportunity ({ arbToken, amount, from, arbitrageContractAddress }) {
    return Promise.resolve({})
  }
}

module.exports = ArbitrageRepoMock
