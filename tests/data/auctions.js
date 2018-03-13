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
    sellVolume: 76.547844,      // RDN. aprox $315
    sellVolumeNext: 12.547844,  // RDN
    buyVolume: 0                // ETH
  },
  'ETH-RDN': {
    index: 77,
    auctionStart: new Date(),
    // https://walletinvestor.com/converter/usd/ethereum/290
    sellVolume: 0.289432,       // ETH. aprox $290
    sellVolumeNext: 12.547844,  // ETH
    buyVolume: 0                // RDN
  },
  'OMG-ETH': {
    // Aprox 0.022220 ETH/OMG
    index: 3,
    auctionStart: null,
    // https://walletinvestor.com/converter/usd/omisego/315
    sellVolume: 22.569633,      // OMG. aprox $315
    sellVolumeNext: 12.547844,  // OMG
    buyVolume: 0                // ETH
  },
  'ETH-OMG': {
    index: 3,
    auctionStart: null,
    // https://walletinvestor.com/converter/usd/ethereum/550
    sellVolume: 1.381729,       // ETH. aprox $1384
    sellVolumeNext: 10.547844,  // ETH
    buyVolume: 0                // OMG
  }
}

module.exports = {
  pricesInUSD,
  auctions
}
