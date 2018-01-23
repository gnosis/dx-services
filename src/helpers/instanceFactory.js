// const debug = require('debug')('dx-service:helpers:instanceFactory')
const config = require('../../conf/config.js')

// Auction Repo
const AuctionRepoMock =
  require('../repositories/AuctionRepo/AuctionRepoMock')
const auctionRepo = new AuctionRepoMock({})

// Exchange repo
const ExchangePriceRepoMock =
  require('../repositories/ExchangePriceRepo/ExchangePriceRepoMock')
const exchangePriceRepo = new ExchangePriceRepoMock({})

// Auction service
const AuctionService = require('../services/AuctionService')
const auctionService = new AuctionService({
  // repos
  auctionRepo,
  exchangePriceRepo,

  // conf
  minimumSellVolume: config.MINIMUM_SELL_VOLUME_USD
})

module.exports = {
  config,

  // services
  auctionService
}
