const debug = require('debug')('dx-service:helpers:instanceFactory')
const originalConfig = require('../../conf/')
let ethereumClient

async function createInstances ({ test = false, config = {} }) {
  const mergedConfig = Object.assign({}, originalConfig, config)
  debug('Initializing app for %s environment...', mergedConfig.ENVIRONMENT)

  // Repos
  const exchangePriceRepo = getExchangePriceRepo(mergedConfig)
  const auctionRepoPromise = getAuctionRepoPromise(mergedConfig)
  const ethereumRepoPromise = getEthereumRepoPromise(mergedConfig)
  const auctionRepo = await auctionRepoPromise
  const ethereumRepo = await ethereumRepoPromise

  // Services
  const botService = getBotService({
    config: mergedConfig,
    exchangePriceRepo,
    auctionRepo,
    ethereumRepo
  })

  const apiService = getApiService({
    config: mergedConfig,
    exchangePriceRepo,
    auctionRepo,
    ethereumRepo
  })

  let instances = {
    config: mergedConfig,

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

function getEhereumClient (config) {
  if (!ethereumClient) {
    const EthereumClient = require('./EthereumClient')
    ethereumClient = new EthereumClient({
      url: config.ETHEREUM_RPC_URL,
      mnemonic: config.BOT_ACCOUNT_MNEMONIC
    })
  }

  return ethereumClient
}

async function getEthereumRepoPromise (config) {
  switch (config.ETHEREUM_REPO_IMPL) {
    case 'mock':
      const EthereumRepoMock = require('../repositories/EthereumRepo/EthereumRepoMock')
      return new EthereumRepoMock({})

    case 'impl':
      const ethereumClient = getEhereumClient(config)
      const EthereumRepoImpl = require('../repositories/EthereumRepo/EthereumRepoImpl')
      return new EthereumRepoImpl({
        ethereumClient
      })

    default:
      throw new Error('Unkown implementation for AuctionRepo: ' + config.AUCTION_REPO_IMPL)
  }
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
        contractDefinitions: config.CONTRACT_DEFINITIONS,
        dxContractAddress: config.DX_CONTRACT_ADDRESS,
        gnoTokenAddress: config.GNO_TOKEN_ADDRESS,
        erc20TokenAddresses: config.ERC20_TOKEN_ADDRESSES,
        devContractsBaseDir: config.CONTRACTS_BASE_DIR // just for develop (TODO: improve)
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

function getApiService ({ config, auctionRepo, exchangePriceRepo }) {
  const ApiService = require('../services/ApiService')
  return new ApiService({
    // Repos
    auctionRepo,
    exchangePriceRepo
  })
}

module.exports = createInstances
