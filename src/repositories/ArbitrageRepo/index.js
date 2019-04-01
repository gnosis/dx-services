const conf = require('../../../conf')

let arbitrageRepo

module.exports = async () => {
  if (!arbitrageRepo) {
    arbitrageRepo = await _createArbitrageRepo()
  }
  return arbitrageRepo
}

async function _loadArbitrageContracts ({
  ethereumClient, contractDefinitions, arbitrageContractAddress, uniswapFactoryAddress
}) {
  const arbitrageContract = ethereumClient
    .loadContract(contractDefinitions.ArbitrageContract)
  const arbitrageContractInstance = arbitrageContract.at(arbitrageContractAddress)

  const uniswapFactory = ethereumClient
    .loadContract(contractDefinitions.UniswapFactory)
  const uniswapFactoryInstance = uniswapFactory.at(uniswapFactoryAddress)

  const uniswapExchange = ethereumClient
    .loadContract(contractDefinitions.UniswapExchange)

  return [ arbitrageContractInstance, uniswapFactoryInstance, uniswapExchange ]
}

async function _createArbitrageRepo () {
  // Get factory
  const {
    Factory: ArbitrageRepo,
    factoryConf: arbitrageRepoConf
  } = conf.getFactory('ARBITRAGE_REPO')

  // Get contracts
  const loadContracts = require('../../loadContracts')
  let contracts = await loadContracts()

  // Get ethereum client
  const getEthereumClient = require('../../helpers/ethereumClient')
  const ethereumClient = await getEthereumClient()

  // Get ethereum repo
  const getEthereumRepo = require('../EthereumRepo')
  const ethereumRepo = await getEthereumRepo()

  const {
    CACHE,
    CONTRACT_DEFINITIONS,
    UNISWAP_FACTORY_ADDRESS,
    ARBITRAGE_CONTRACT_ADDRESS,
    // DEFAULT_GAS,
    OVER_FAST_PRICE_FACTOR,
    GAS_ESTIMATION_CORRECTION_FACTOR,
    DEFAULT_GAS_PRICE_USED
  } = conf

  const [ arbitrageContract, uniswapFactory, uniswapExchange ] = await _loadArbitrageContracts({
    ethereumClient,
    contractDefinitions: CONTRACT_DEFINITIONS,
    uniswapFactoryAddress: UNISWAP_FACTORY_ADDRESS,
    arbitrageContractAddress: ARBITRAGE_CONTRACT_ADDRESS
  })

  contracts = { ...contracts, arbitrageContract, uniswapFactory, uniswapExchange }

  return new ArbitrageRepo({
    ethereumRepo,
    ethereumClient,
    contracts,

    // Cache
    cacheConf: CACHE,

    // Gas price
    // defaultGas: DEFAULT_GAS,
    gasPriceDefault: DEFAULT_GAS_PRICE_USED,

    // Retry logic
    overFastPriceFactor: OVER_FAST_PRICE_FACTOR,
    gasEstimationCorrectionFactor: GAS_ESTIMATION_CORRECTION_FACTOR,

    // Override config
    ...arbitrageRepoConf
  })
}
