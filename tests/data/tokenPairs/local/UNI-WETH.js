module.exports =
// UNI-WETH
{
  // UNI
  tokenA: {
    address: '0xd54b47F8e6A1b97F3A84f63c867286272b273b7C',
    funding: 0.3
  },
  // WETH
  tokenB: {
    address: '0x8f0483125fcb9aaaefa9209d8e9d7b9c8b9fb90f',
    funding: 10
  },
  // Price: https://www.coingecko.com/en/price_charts/raiden-network/eth
  initialPrice: {
    numerator: 1,
    denominator: 1
  }
}
