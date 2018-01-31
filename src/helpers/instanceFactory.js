// const debug = require('debug')('dx-service:helpers:instanceFactory')
const originalConfig = require('../../conf/config.js')
let ethereumClient

async function createInstances ({ test = false, config = {} }) {
  const mergedConfig = Object.assign({}, originalConfig, config)

  // Repos
  const exchangePriceRepo = getExchangePriceRepo(mergedConfig)
  const auctionRepoPromise = getAuctionRepoPromise(mergedConfig)
  const auctionRepo = await auctionRepoPromise

  // Services
  const botService = getBotService({
    config: mergedConfig,
    exchangePriceRepo,
    auctionRepo
  })

  let instances = {
    config: mergedConfig,

    // services
    botService
  }

  if (test) {
    // For testing is handy to return also the repos, client, etc
    instances = Object.assign({}, instances, {
      exchangePriceRepo,
      auctionRepo,
      ethereumClient
    })
  }

  return instances
}

function getEhereumClient (config) {
  if (!ethereumClient) {
    const EthereumClient = require('./EthereumClient')
    ethereumClient = new EthereumClient({
      url: config.ETHEREUM_JSON_RPC_PROVIDER,
      contractsBaseDir: config.CONTRACTS_BASE_DIR
    })
  }

  return ethereumClient
}

function getAuctionRepoPromise (config) {
  let auctionRepoPromise
  switch (config.AUCTION_REPO_IMPL) {
    case 'mock':
      const AuctionRepoMock = require('../repositories/AuctionRepo/AuctionRepoMock')
      auctionRepoPromise = Promise.resolve(new AuctionRepoMock({}))
      break

    case 'ethereum':
      const ethereumClient = getEhereumClient(config)
      const AuctionRepoEthereum = require('../repositories/AuctionRepo/AuctionRepoEthereum')
      const auctionRepoEthereum = new AuctionRepoEthereum({
        ethereumClient,
        contractsBaseDir: config.CONTRACTS_BASE_DIR,
        contractsBaseDirDx: config.CONTRACTS_DUTCH_EXCHANGE_DIR
      })
      // Return the repo when it's ready
      auctionRepoPromise = auctionRepoEthereum
        .ready
        .then(() => auctionRepoEthereum)
      break

    default:
      throw new Error('Unkown implementation for AuctionRepo: ' + config.AUCTION_REPO_IMPL)
  }

  return auctionRepoPromise
}

function getExchangePriceRepo (config) {
  const ExchangePriceRepoMock =
    require('../repositories/ExchangePriceRepo/ExchangePriceRepoMock')

  return new ExchangePriceRepoMock({})
}

function getBotService ({ config, auctionRepo, exchangePriceRepo }) {
  const BotService = require('../services/BotService')
  return new BotService({
    // Repos
    auctionRepo,
    exchangePriceRepo,

    // Config
    minimumSellVolume: config.MINIMUM_SELL_VOLUME_USD
  })
}

module.exports = createInstances
