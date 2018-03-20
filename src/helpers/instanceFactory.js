const debug = require('debug')('DEBUG-dx-service:helpers:instanceFactory')
const originalConfig = require('../../conf/')
const messageNotifier = require('./messageNotifier')
/*
const environment = process.env.NODE_ENV
const isLocal = environment === 'local'
*/

const EventBus = require('./EventBus')

async function createInstances ({
  test = false,
  config: configOverride = {}
}) {
  const config = Object.assign({}, originalConfig, configOverride)
  debug('Initializing app for %s environment...', config.ENVIRONMENT)

  // We init the error handler
  messageNotifier.init({ sentryDsn: config.SENTRY_DSN })

  // Create the eventBus
  const eventBus = new EventBus()

  // Ethereum client
  const ethereumClient = _getEhereumClient(config)

  // Contracts
  const contracts = await _loadContracts(config, ethereumClient)

  // Repos
  const exchangePriceRepo = _getExchangePriceRepo(config)
  const auctionRepo = _getAuctionRepo(config, ethereumClient, contracts)
  const ethereumRepo = _getEthereumRepo(config, ethereumClient)

  // Service: Liquidity service
  const liquidityService = _getLiquidityService({
    config: config,
    exchangePriceRepo,
    auctionRepo,
    ethereumRepo
  })

  // Service: DX info service
  const dxInfoService = _getDxInfoService({
    config: config,
    exchangePriceRepo,
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
    config: config
  })
  
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

    // services
    liquidityService,
    dxInfoService,
    dxTradeService,
    botsService
  }

  if (test) {
    // For testing is handy to return also the repos, client, etc
    instances = Object.assign({}, instances, {
      exchangePriceRepo,
      auctionRepo,
      ethereumRepo,
      ethereumClient
    })
  }
  return instances
}

function _getEhereumClient (config) {
  const EthereumClient = require('./EthereumClient')
  const ethereumClient = new EthereumClient({
    url: config.ETHEREUM_RPC_URL,
    mnemonic: config.MNEMONIC
  })

  /*
  // TODO: Simplify local development by running the EthereumTestRpcNode
  if (isLocal) {
    const EthereumTestRpcNode = require('../../tests/helpers/EthereumTestRpcNode')
    const ethereumTestRpcNode = new EthereumTestRpcNode({
      web3: ethereumClient.getWeb3(),
      mnemonic: config.ETHEREUM_RPC_URL,
      port: 8646,
      totalAccounts: 5
    })
    ethereumTestRpcNode.start()
  }
  */

  return ethereumClient
}

function _getAuctionEventWatcher (config, eventBus, contracts) {
  const AuctionEventWatcher = require('../bots/AuctionEventWatcher')
  return new AuctionEventWatcher({
    markets: config.MARKETS,
    eventBus: eventBus,
    contracts
  })
}

async function _loadContracts (config, ethereumClient) {
  const ContractLoader = require('./ContractLoader')

  const contractLoader = new ContractLoader({
    ethereumClient,
    contractDefinitions: config.CONTRACT_DEFINITIONS,
    dxContractAddress: config.DX_CONTRACT_ADDRESS,
    gnoTokenAddress: config.GNO_TOKEN_ADDRESS,
    erc20TokenAddresses: config.ERC20_TOKEN_ADDRESSES,
    devContractsBaseDir: config.CONTRACTS_BASE_DIR // just for develop (TODO: improve)
  })

  return contractLoader.loadContracts()
}

function _getEthereumRepo (config, ethereumClient) {
  switch (config.ETHEREUM_REPO_IMPL) {
    case 'mock':
      const EthereumRepoMock = require('../repositories/EthereumRepo/EthereumRepoMock')
      return new EthereumRepoMock({})

    case 'impl':
      const EthereumRepoImpl = require('../repositories/EthereumRepo/EthereumRepoImpl')
      return new EthereumRepoImpl({
        ethereumClient
      })

    default:
      throw new Error('Unkown implementation for AuctionRepo: ' + config.AUCTION_REPO_IMPL)
  }
}

function _getAuctionRepo (config, ethereumClient, contracts) {
  let auctionRepoPromise
  switch (config.AUCTION_REPO_IMPL) {
    case 'mock':
      const AuctionRepoMock = require('../repositories/AuctionRepo/AuctionRepoMock')
      auctionRepoPromise = Promise.resolve(new AuctionRepoMock({}))
      break

    case 'impl':
      const AuctionRepoImpl = require('../repositories/AuctionRepo/AuctionRepoImpl')
      const auctionRepoImpl = new AuctionRepoImpl({
        ethereumClient,
        defaultGas: config.DEFAULT_GAS,
        gasPriceGWei: config.GAS_PRICE_GWEI,
        contracts
      })

      return auctionRepoImpl
    default:
      throw new Error('Unkown implementation for AuctionRepo: ' + config.AUCTION_REPO_IMPL)
  }

  return auctionRepoPromise
}

function _getExchangePriceRepo (config) {
  const ExchangePriceRepoMock =
    require('../repositories/ExchangePriceRepo/ExchangePriceRepoMock')

  return new ExchangePriceRepoMock({})
}

function _getLiquidityService ({ config, auctionRepo, exchangePriceRepo, ethereumRepo }) {
  const LiquidityService = require('../services/LiquidityService')
  return new LiquidityService({
    // Repos
    auctionRepo,
    exchangePriceRepo,
    ethereumRepo,

    // Config
    minimumSellVolume: config.MINIMUM_SELL_VOLUME_USD
  })
}

function _getDxInfoService ({ config, auctionRepo, exchangePriceRepo, ethereumRepo }) {
  const DxInfoService = require('../services/DxInfoService')
  return new DxInfoService({
    // Repos
    auctionRepo,
    exchangePriceRepo,
    markets: config.MARKETS,
    ethereumRepo
  })
}

function _getDxTradeService ({ config, auctionRepo, ethereumRepo }) {
  const DxTradeService = require('../services/DxTradeService')
  return new DxTradeService({
    // Repos
    auctionRepo,
    markets: config.MARKETS,
    ethereumRepo
  })
}

function _getBotsService ({ config }) {
  const BotsService = require('../services/BotsService')
  return new BotsService()
}

module.exports = createInstances
