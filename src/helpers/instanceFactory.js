const debug = require('debug')('DEBUG-dx-service:helpers:instanceFactory')
const originalConfig = require('../../conf/')
const messageNotifier = require('./messageNotifier')
/*
const environment = process.env.NODE_ENV
const isLocal = environment === 'local'
*/

const EventBus = require('./EventBus')
const SlackClient = require('./SlackClient')
const loadContracts = require('../loadContracts')
const getEthereumClient = require('../getEthereumClient')
const getAuctionRepo = require('../repositories/AuctionRepo')
const getPriceRepo = require('../repositories/PriceRepo')
const getEthereumRepo = require('../repositories/EthereumRepo')

async function createInstances ({
  test = false,
  createReportService = true, // TODO: Improve how we pull services
  config: configOverride = {}
} = {}) {
  const config = Object.assign({}, originalConfig, configOverride)
  debug('Initializing app for %s environment...', config.ENVIRONMENT)

  // We init the error handler
  messageNotifier.init({ sentryDsn: config.SENTRY_DSN })

  // Create the eventBus
  const eventBus = new EventBus()

  // Ethereum client
  const ethereumClient = await getEthereumClient()

  // Contracts
  const contracts = await loadContracts()

  // Repos
  const auctionRepo = await getAuctionRepo()
  const priceRepo = await getPriceRepo()
  const ethereumRepo = await getEthereumRepo()

  // Slack client
  const slackClient = new SlackClient()

  // Service: Liquidity service
  const liquidityService = _getLiquidityService({
    config: config,
    priceRepo,
    auctionRepo,
    ethereumRepo
  })

  // Service: DX info service
  const dxInfoService = _getDxInfoService({
    config: config,
    priceRepo,
    auctionRepo,
    ethereumRepo
  })

  // Service: DX trade service
  const dxManagementService = _getDxManagementService({
    config: config,
    auctionRepo,
    ethereumRepo
  })

  // Service: DX trade service
  const dxTradeService = _getDxTradeService({
    config: config,
    auctionRepo,
    ethereumRepo
  })

  // Service: Bots service
  const botsService = _getBotsService({
    config: config,
    auctionRepo,
    ethereumRepo
  })

  // Service: Market service
  const marketService = _getMarketService({
    config: config,
    priceRepo
  })

  const auctionService = _getAuctionService({
    config: config,
    auctionRepo,
    ethereumRepo
  })

  let reportService
  if (createReportService) {
    reportService = _getReportService({
      config: config,
      auctionRepo,
      ethereumRepo,
      slackClient
    })
  } else {
    reportService = null
  }

  // Event Watcher
  const auctionEventWatcher = _getAuctionEventWatcher(
    config, eventBus, contracts
  )

  let instances = {
    config: config,
    eventBus,
    contracts,
    auctionEventWatcher,
    ethereumClient,
    slackClient,

    // services
    liquidityService,
    dxInfoService,
    dxManagementService,
    dxTradeService,
    botsService,
    marketService,
    auctionService,
    reportService
  }

  if (test) {
    // For testing is handy to return also the repos, client, etc
    instances = Object.assign({}, instances, {
      priceRepo,
      auctionRepo,
      ethereumRepo,
      ethereumClient
    })
  }
  return instances
}

function _getAuctionEventWatcher (config, eventBus, contracts) {
  const AuctionEventWatcher = require('../bots/AuctionEventWatcher')
  return new AuctionEventWatcher({
    config,
    eventBus: eventBus,
    contracts
  })
}

function _getAuctionRepo (config, ethereumClient, contracts) {
  let auctionRepoPromise
  switch (config.AUCTION_REPO) {
    case 'mock':
      const AuctionRepoMock = require('../repositories/AuctionRepo/AuctionRepoMock')
      auctionRepoPromise = Promise.resolve(new AuctionRepoMock({
        config
      }))
      break

    case 'impl':
      const AuctionRepoImpl = require('../repositories/AuctionRepo/AuctionRepoImpl')
      const auctionRepoImpl = new AuctionRepoImpl({
        config,
        contracts,
        ethereumClient
      })

      return auctionRepoImpl
    default:
      throw new Error('Unkown implementation for AuctionRepo: ' + config.AUCTION_REPO)
  }

  return auctionRepoPromise
}

function _getLiquidityService ({ config, auctionRepo, priceRepo, ethereumRepo }) {
  const LiquidityService = require('../services/LiquidityService')
  return new LiquidityService({
    config,

    // Repos
    auctionRepo,
    priceRepo,
    ethereumRepo
  })
}

function _getDxInfoService ({ config, auctionRepo, priceRepo, ethereumRepo }) {
  const DxInfoService = require('../services/DxInfoService')
  return new DxInfoService({
    config,

    // Repos
    auctionRepo,
    priceRepo,
    ethereumRepo
  })
}

function _getDxManagementService ({ config, auctionRepo, ethereumRepo }) {
  const DxManagementService = require('../services/DxManagementService')
  return new DxManagementService({
    config,

    // Repos
    auctionRepo,
    ethereumRepo
  })
}

function _getDxTradeService ({ config, auctionRepo, ethereumRepo }) {
  const DxTradeService = require('../services/DxTradeService')
  return new DxTradeService({
    config,

    // Repos
    auctionRepo,
    ethereumRepo
  })
}

function _getBotsService ({ config, auctionRepo, ethereumRepo }) {
  const BotsService = require('../services/BotsService')
  return new BotsService({
    config,

    // Repos
    auctionRepo,
    ethereumRepo
  })
}

function _getMarketService ({ config, priceRepo }) {
  const MarketService = require('../services/MarketService')
  return new MarketService({
    config,

    // Repos
    priceRepo
  })
}

function _getAuctionService ({ config, auctionRepo, ethereumRepo }) {
  const AuctionService = require('../services/AuctionService')
  return new AuctionService({
    config,

    // Repos
    auctionRepo,
    ethereumRepo
  })
}

function _getReportService ({ config, auctionRepo, ethereumRepo, slackClient }) {
  const ReportService = require('../services/ReportService')
  return new ReportService({
    config,

    // Repos
    auctionRepo,
    ethereumRepo,
    slackClient
  })
}

module.exports = createInstances
