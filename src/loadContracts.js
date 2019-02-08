const ContractLoader = require('./helpers/ContractLoader')
const getEthereumClient = require('./getEthereumClient')

const conf = require('../conf')

let contracts
/**
* Loads the contracts into an instance.
* @return {Object} A dictionary object containing the instances of the contracts.
*/
async function loadContracts () {
  const ethereumClient = await getEthereumClient()
  if (!contracts) {
    const {
      CONTRACT_DEFINITIONS,
      UNISWAP_FACTORY_ADDRESS,
      ARBITRAGE_CONTRACT_ADDRESS,
      DX_CONTRACT_ADDRESS,
      DX_HELPER_ADDRESS,
      GNO_TOKEN_ADDRESS,
      ERC20_TOKEN_ADDRESSES,
      CONTRACTS_BASE_DIR
    } = conf

    let instanceArgs = {
      ethereumClient,
      contractDefinitions: CONTRACT_DEFINITIONS,
      uniswapFactoryAddress: UNISWAP_FACTORY_ADDRESS,
      arbitrageContractAddress: ARBITRAGE_CONTRACT_ADDRESS,
      dxContractAddress: DX_CONTRACT_ADDRESS,
      dxHelperAddress: DX_HELPER_ADDRESS,
      gnoToken: GNO_TOKEN_ADDRESS,
      erc20TokenAddresses: ERC20_TOKEN_ADDRESSES,
      contractsBaseDir: CONTRACTS_BASE_DIR
    }

    const contractLoader = new ContractLoader(instanceArgs)
    contracts = await contractLoader.loadContracts()
  }

  return contracts
}

module.exports = loadContracts