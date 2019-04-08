const loggerNamespace = 'dx-service:repositories:ArbitrageRepo'
const Logger = require('../../helpers/Logger')
const logger = new Logger(loggerNamespace)

const environment = process.env.NODE_ENV
const isLocal = environment === 'local'
const assert = require('assert')
const conf = require('../../../conf')

let arbitrageRepo

module.exports = async () => {
  if (!arbitrageRepo) {
    arbitrageRepo = await _createArbitrageRepo()
  }
  return arbitrageRepo
}

async function _getDeployedAddress (contractName, contract, enforceLocalOnly = true) {
  if (enforceLocalOnly) {
    assert(
      isLocal,
      `Getting the deployed address from the truffle contract \
is only avaliable in LOCAL. Environment = ${environment}`
    )
  }

  return contract
    .deployed()
    .then(contractInstance => contractInstance.address)
    .catch(error => {
      logger.error({
        msg: 'Error loading the contract address from "%s": %s',
        params: [contractName, error.toString()],
        error
      })

      // Rethrow error after logging
      throw error
    })
}

async function _loadArbitrageContract ({
  ethereumClient, contractDefinitions, arbitrageContractAddress
}) {
  const arbitrageContract = ethereumClient
    .loadContract(contractDefinitions.ArbitrageContract)
  let localArbitrageContractAddress
  if (arbitrageContractAddress) {
    localArbitrageContractAddress = arbitrageContractAddress
  } else {
    localArbitrageContractAddress = await _getDeployedAddress(
      'ArbitrageLocal',
      arbitrageContract,
      true
    )
  }
  const arbitrageContractInstance = arbitrageContract.at(localArbitrageContractAddress)
  return arbitrageContractInstance
}

async function _loadUniswapFactory ({
  ethereumClient, contractDefinitions, uniswapFactoryAddress
}) {
  const uniswapFactory = ethereumClient
    .loadContract(contractDefinitions.UniswapFactory)
  let localUniswapFactoryAddress
  if (uniswapFactoryAddress) {
    localUniswapFactoryAddress = uniswapFactoryAddress
  } else {
    localUniswapFactoryAddress = await _getDeployedAddress(
      'IUniswapFactory',
      uniswapFactory,
      true
    )
  }
  const uniswapFactoryInstance = uniswapFactory.at(localUniswapFactoryAddress)
  return uniswapFactoryInstance
}

async function _loadEmptyUniswapExchange ({
  ethereumClient, contractDefinitions
}) {
  return ethereumClient
    .loadContract(contractDefinitions.UniswapExchange)
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

  const [ arbitrageContract, uniswapFactory, uniswapExchange ] = await Promise.all([
    _loadArbitrageContract({
      ethereumClient,
      contractDefinitions: CONTRACT_DEFINITIONS,
      arbitrageContractAddress: ARBITRAGE_CONTRACT_ADDRESS }),
    _loadUniswapFactory({
      ethereumClient,
      contractDefinitions: CONTRACT_DEFINITIONS,
      uniswapFactoryAddress: UNISWAP_FACTORY_ADDRESS
    }),
    _loadEmptyUniswapExchange({
      ethereumClient, contractDefinitions: CONTRACT_DEFINITIONS
    })
  ])

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
