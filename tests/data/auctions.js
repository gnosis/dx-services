const BigNumber = require('bignumber.js')

const pricesInUSD = [{
  token: 'RDN',
  price: 4.115 // $/RDN
}, {
  token: 'ETH',
  price: 1001.962 // $/ETH
}, {
  token: 'OMG',
  price: 13.957 // $/OMG
}]

const auctions = {
  'RDN-ETH': {
    // Aprox 0.004079 ETH/RDN
    index: 77,
    auctionStart: new Date(),
    // https://walletinvestor.com/converter/usd/raiden-network-token/315
    sellVolume: new BigNumber('76.5478441e18'),      // RDN. aprox $315
    sellVolumeNext: new BigNumber('12.5478441e18'),  // RDN
    buyVolume: new BigNumber('0e18')                // ETH
  },
  'ETH-RDN': {
    index: 77,
    auctionStart: new Date(),
    // https://walletinvestor.com/converter/usd/ethereum/290
    sellVolume: new BigNumber('0.2894321e18'),       // ETH. aprox $290
    sellVolumeNext: new BigNumber('12.5478441e18'),  // ETH
    buyVolume: new BigNumber('0e18')                // RDN
  },
  'OMG-ETH': {
    // Aprox 0.022220 ETH/OMG
    index: 3,
    auctionStart: null,
    // https://walletinvestor.com/converter/usd/omisego/315
    sellVolume: new BigNumber('22.569633e18'),      // OMG. aprox $315
    sellVolumeNext: new BigNumber('12.547844e18'),  // OMG
    buyVolume: new BigNumber('0e18')                // ETH
  },
  'ETH-OMG': {
    index: 3,
    auctionStart: null,
    // https://walletinvestor.com/converter/usd/ethereum/550
    sellVolume: new BigNumber('1.381729e18'),       // ETH. aprox $1384
    sellVolumeNext: new BigNumber('10.547844e18'),  // ETH
    buyVolume: new BigNumber('0e18')                // OMG
  }
}

module.exports = {
  pricesInUSD,
  auctions
}
