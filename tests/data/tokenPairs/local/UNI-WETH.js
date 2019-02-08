module.exports =
// UNI-WETH
{
  // UNI
  tokenA: {
    address: '0x8273e4B8ED6c78e252a9fCa5563Adfcc75C91b2A',
    funding: 0
  },
  // WETH
  tokenB: {
    address: '0xf25186b5081ff5ce73482ad761db0eb0d25abfbf',
    funding: 20
  },
  // Price: https://www.coingecko.com/en/price_charts/raiden-network/eth
  initialPrice: {
    numerator: 1,
    denominator: 1
  }
}
