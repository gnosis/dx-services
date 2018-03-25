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

const balances = {
  'RDN': {
    '0x424a46612794dbb8000194937834250Dc723fFa5': new BigNumber('517.345e18'), // Anxo
    '0x8c3fab73727E370C1f319Bc7fE5E25fD9BEa991e': new BigNumber('30.20e18'),   // Pepe
    '0x627306090abaB3A6e1400e9345bC60c78a8BEf57': new BigNumber('1000.0e18'),  // Ganache
    '0xAe6eCb2A4CdB1231B594cb66C2dA9277551f9ea7': new BigNumber('601.112e18')  // Dani
  },
  'ETH': {
    '0x424a46612794dbb8000194937834250Dc723fFa5': new BigNumber('3.44716e18'), // Anxo
    '0x8c3fab73727E370C1f319Bc7fE5E25fD9BEa991e': new BigNumber('2.23154e18'), // Pepe
    '0x627306090abaB3A6e1400e9345bC60c78a8BEf57': new BigNumber('3.88130e18'), // Ganache
    '0xAe6eCb2A4CdB1231B594cb66C2dA9277551f9ea7': new BigNumber('4.01234e18')  // Dani
  },
  'OMG': {
    '0x424a46612794dbb8000194937834250Dc723fFa5': new BigNumber('267.345e18'), // Anxo
    '0x8c3fab73727E370C1f319Bc7fE5E25fD9BEa991e': new BigNumber('15.20e18'),   // Pepe
    '0x627306090abaB3A6e1400e9345bC60c78a8BEf57': new BigNumber('500.0e18'),   // Ganache
    '0xAe6eCb2A4CdB1231B594cb66C2dA9277551f9ea7': new BigNumber('301.112e18')  // Dani
  }
}

const auctions = {
  'RDN-ETH': {
    // Aprox 0.004079 ETH/RDN
    index: 77,
    auctionStart: new Date(),
    // https://walletinvestor.com/converter/usd/raiden-network-token/315
    sellVolume: new BigNumber('76.5478441e18'),      // RDN. aprox $315
    sellVolumeNext: new BigNumber('12.5478441e18'),  // RDN
    buyVolume: new BigNumber('0e18')                 // ETH
  },
  'ETH-RDN': {
    index: 77,
    auctionStart: new Date(),
    // https://walletinvestor.com/converter/usd/ethereum/290
    sellVolume: new BigNumber('0.2894321e18'),       // ETH. aprox $290
    sellVolumeNext: new BigNumber('12.5478441e18'),  // ETH
    buyVolume: new BigNumber('0e18')                 // RDN
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
  balances,
  auctions
}
