const MARKETS = {
  'RDN': 'ETH',
  'OMG': 'ETH'
}

const MINIMUM_SELL_VOLUME_USD = 1000

const BUY_THRESHOLDS = [{
  marketPriceRatio: 1,
  buyRatio: 1 / 3
}, {
  marketPriceRatio: 0.98,
  buyRatio: 2 / 3
}, {
  marketPriceRatio: 0.96,
  buyRatio: 1
}]

// TODO;
//  * Instead of this config being static, Initialized the config
//  * Rename the const and add the 'DEFAULT_' prefix
//  * Override defaults with arguments and environent vars
//  * Add environent config

/*
TODO: Define the minimun config required to trade

const BUY_TOKENS_KEYS =
const CONTRACT_XXXXX_ADDRESS =
const CONTRACT_YYYYY_ADDRESS =
*/

module.exports = {
  MARKETS,
  MINIMUM_SELL_VOLUME_USD,
  BUY_THRESHOLDS
}
