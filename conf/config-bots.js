const { DX_BOTS_CHANNEL, DX_BOTS_DEV_CHANNEL } = require('./slackChannels')

const BOT_MARKETS = [
  { tokenA: 'WETH', tokenB: 'RDN' }
  // { tokenA: 'WETH', tokenB: 'OMG' }
]

const BUY_LIQUIDITY_RULES_DEFAULT = [
  // Buy 1/2 if price falls below 99%
  {
    marketPriceRatio: {
      numerator: 99,
      denominator: 100
    },
    buyRatio: {
      numerator: 1,
      denominator: 2
    }
  },

  // Buy the 100% if price falls below 96%
  {
    marketPriceRatio: {
      numerator: 96,
      denominator: 100
    },
    buyRatio: {
      numerator: 1,
      denominator: 1
    }
  }
]

const MAIN_BOT_ACCOUNT = 0
const BACKUP_BOT_ACCOUNT = 1

const BUY_BOT_MAIN = {
  name: 'Main buyer bot',
  factory: 'src/bots/BuyLiquidityBot',
  markets: BOT_MARKETS,
  accountIndex: MAIN_BOT_ACCOUNT,
  rules: BUY_LIQUIDITY_RULES_DEFAULT,
  notifications: [{
    type: 'slack',
    channel: DX_BOTS_DEV_CHANNEL
  }],
  checkTimeInMilliseconds: 60 * 1000 // 60s
}

const BUY_BOT_BACKUP = {
  name: 'Backup buyer for RDN-WETH',
  factory: 'src/bots/BuyLiquidityBot',
  markets: [
    { tokenA: 'WETH', tokenB: 'RDN' }
  ],
  accountIndex: BACKUP_BOT_ACCOUNT,
  rules: [{
    // Buy the 100% if price falls below 90%
    marketPriceRatio: {
      numerator: 90,
      denominator: 100
    },
    buyRatio: {
      numerator: 1,
      denominator: 1
    }
  }],
  notifications: [{
    type: 'slack',
    channel: '' // If none provided uses SLACK_CHANNEL_BOT_TRANSACTIONS
  }, {
    type: 'email',
    email: ''
  }],
  checkTimeInMilliseconds: 60 * 1000, // 60s
  disableHighSellVolumeCheck: true,
  minimumAmountInUsdForToken: 850 // $850
}

const SELL_BOT_MAIN = {
  name: 'Main seller bot',
  factory: 'src/bots/SellLiquidityBot',
  markets: BOT_MARKETS,
  accountIndex: MAIN_BOT_ACCOUNT,
  notifications: [{
    type: 'slack',
    channel: '' // If none provided uses SLACK_CHANNEL_BOT_TRANSACTIONS
  }],
  checkTimeInMilliseconds: 60 * 1000 // 60s
}

// TODO Enable by default in future versions
// const DEPOSIT_BOT = {
//   name: 'Deposit bot',
//   notifications: [{
//     type: 'slack',
//     channel: '' // If none provided uses SLACK_CHANNEL_BOT_TRANSACTIONS
//   }],
//   // You can use this to have some time to manually withdraw funds
//   inactivityPeriods: [{
//     from: '11:30',
//     to: '12:00'
//   }, {
//     from: '15:30',
//     to: '16:00'
//   }],
//   checkTimeInMilliseconds: 5 * 60 * 1000 // 5min
// }

const AUTO_CLAIM_AUCTIONS = 90

module.exports = {
  BOTS: [
    BUY_BOT_MAIN
    /*
    BUY_BOT_MAIN,
    BUY_BOT_BACKUP,
    SELL_BOT_MAIN
    */
  ],

  // TODO: Try to remove the next props
  // MAIN_BOT_ACCOUNT,
  BUY_LIQUIDITY_RULES_DEFAULT,
  AUTO_CLAIM_AUCTIONS
}
