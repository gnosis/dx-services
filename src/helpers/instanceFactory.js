const debug = require('debug')('dx-service:helpers:instanceFactory')
const originalConfig = require('../../conf/')

const EventBus = require('./EventBus')

async function createInstances ({ test = false, config = {} }) {
  const mergedConfig = Object.assign({}, originalConfig, config)
  debug('Initializing app for %s environment...', mergedConfig.ENVIRONMENT)

  // Create the eventBus
  const eventBus = new EventBus()

  // Ethereum client
  const ethereumClient = _getEhereumClient(mergedConfig)

  // Contracts
  const contracts = await _loadContracts(mergedConfig, ethereumClient)

  // Repos
  const exchangePriceRepo = _getExchangePriceRepo(mergedConfig)
  const auctionRepo = _getAuctionRepo(mergedConfig, ethereumClient, contracts)
  const ethereumRepo = _getEthereumRepo(mergedConfig, ethereumClient)

  // Service: Bot service
  const botService = _getBotService({
    config: mergedConfig,
    exchangePriceRepo,
    auctionRepo,
    ethereumRepo
  })

  // Service: Api service
  const apiService = _getApiService({
    config: mergedConfig,
    exchangePriceRepo,
    auctionRepo,
    ethereumRepo
  })

  // Event Watcher
  const auctionEventWatcher = _getAuctionEventWatcher(
    mergedConfig, eventBus, contracts
  )

  let instances = {
    config: mergedConfig,
    eventBus,
    contracts,
    auctionEventWatcher,
    ethereumClient,

    // services
    botService,
    apiService
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
  return ethereumClient
}

function _getAuctionEventWatcher (config, eventBus, contracts) {
  const AuctionEventWatcher = require('./AuctionEventWatcher')
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

function _getBotService ({ config, auctionRepo, exchangePriceRepo }) {
  const BotService = require('../services/BotService')
  return new BotService({
    // Repos
    auctionRepo,
    exchangePriceRepo,

    // Config
    minimumSellVolume: config.MINIMUM_SELL_VOLUME_USD
  })
}

function _getApiService ({ config, auctionRepo, exchangePriceRepo }) {
  const ApiService = require('../services/ApiService')
  return new ApiService({
    // Repos
    auctionRepo,
    exchangePriceRepo
  })
}

module.exports = createInstances
