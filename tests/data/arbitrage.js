const BigNumber = require('bignumber.js')

const tokenInfo = {
  'GNO': {
    decimals: 18
  },
  'WETH': {
    decimals: 18
  },
  'GRID': {
    decimals: 12
  }
}

const uniswapBalances = {
  'GNO-WETH': {
    inputBalance: new BigNumber('100e18'),
    outputBalance: new BigNumber('10e18')
  },
  'GRID-WETH': {
    inputBalance: new BigNumber('137310.17e12'),
    outputBalance: new BigNumber('50.0104e18')
  }
}

module.exports = {
  uniswapBalances,
  tokenInfo
}
