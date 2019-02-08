module.exports =
// UNI-WETH
{
  // UNI
  tokenA: {
    address: '0x8273e4B8ED6c78e252a9fCa5563Adfcc75C91b2A',
    funding: 0.3
  },
  // WETH
  tokenB: {
    address: '0x9fbda871d559710256a2502a2517b794b482db40',
    funding: 10
  },
  // Price: https://www.coingecko.com/en/price_charts/raiden-network/eth
  initialPrice: {
    numerator: 1,
    denominator: 1
  }
}
