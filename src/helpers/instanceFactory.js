const debug = require('debug')('DEBUG-dx-service:helpers:instanceFactory')
const originalConfig = require('../../conf/')
const messageNotifier = require('./messageNotifier')
/*
const environment = process.env.NODE_ENV
const isLocal = environment === 'local'
*/

const eventBus = require('../eventBus')
const loadContracts = require('../loadContracts')
const getEthereumClient = require('../getEthereumClient')

// Repos
const getAuctionRepo = require('../repositories/AuctionRepo')
const getPriceRepo = require('../repositories/PriceRepo')
const getEthereumRepo = require('../repositories/EthereumRepo')
const getSlackRepo = require('../repositories/SlackRepo')

// Services
const getAuctionService = require('../services/AuctionService')
const getBotsService = require('../services/BotsService')
const getDxInfoService = require('../services/DxInfoService')
const getDxManagementService = require('../services/DxManagementService')
const getDxTradeService = require('../services/DxTradeService')
const getLiquidityService = require('../services/LiquidityService')
const getMarketService = require('../services/MarketService')
const getReportService = require('../services/ReportService')

async function createInstances ({
  test = false,
  createReportService = true, // TODO: Improve how we pull services
  config: configOverride = {}
} = {}) {
  const config = Object.assign({}, originalConfig, configOverride)
  debug('Initializing app for %s environment...', config.ENVIRONMENT)

  // We init the error handler
  messageNotifier.init({ sentryDsn: config.SENTRY_DSN })

  // Ethereum client
  const ethereumClient = await getEthereumClient()

  // Contracts
  const contracts = await loadContracts()

  // Repos
  const auctionRepo = await getAuctionRepo()
  const priceRepo = await getPriceRepo()
  const ethereumRepo = await getEthereumRepo()

  // Slack client
  const slackRepo = await getSlackRepo()

  // Services
  const liquidityService = await getLiquidityService()
  const dxInfoService = await getDxInfoService()
  const dxManagementService = await getDxManagementService()
  const dxTradeService = await getDxTradeService()
  const botsService = await getBotsService()
  const marketService = await getMarketService()
  const auctionService = await getAuctionService()

  let reportService
  if (createReportService) {
    reportService = await getReportService()
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
    slackRepo,

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

module.exports = createInstances
