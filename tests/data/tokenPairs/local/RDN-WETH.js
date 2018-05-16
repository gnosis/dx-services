module.exports =
// RDN-WETH
{
  // RDN
  tokenA: {
    address: '0x9fbda871d559710256a2502a2517b794b482db40',
    funding: 0
  },
  // WETH
  tokenB: {
    address: '0xf25186b5081ff5ce73482ad761db0eb0d25abfbf',
    funding: 123456
  },
  // Price: https://www.coingecko.com/en/price_charts/raiden-network/eth
  initialPrice: {
    numerator: 450,
    denominator: 1
  }
}
