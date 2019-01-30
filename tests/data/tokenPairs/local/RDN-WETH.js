module.exports =
// RDN-WETH
{
  // RDN
  tokenA: {
    address: '0xbd2c938b9f6bfc1a66368d08cb44dc3eb2ae27be',
    funding: 0
  },
  // WETH
  tokenB: {
    address: '0xf25186b5081ff5ce73482ad761db0eb0d25abfbf',
    funding: 9.5
  },
  // Price: https://www.coingecko.com/en/price_charts/raiden-network/eth
  initialPrice: {
    numerator: 1,
    denominator: 500
  }
}
