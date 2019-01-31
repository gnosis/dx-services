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
      DX_CONTRACT_ADDRESS,
      GNO_TOKEN_ADDRESS,
      ERC20_TOKEN_ADDRESSES,
      CONTRACTS_BASE_DIR,
      //getDXMode
    } = conf

    let instanceArgs = {
      ethereumClient,
      contractDefinitions: CONTRACT_DEFINITIONS,
      dxContractAddress: DX_CONTRACT_ADDRESS,
      gnoToken: GNO_TOKEN_ADDRESS,
      erc20TokenAddresses: ERC20_TOKEN_ADDRESSES,
      contractsBaseDir: CONTRACTS_BASE_DIR
    }

    // if (getDXMode() == 'safe') {
    //   const {
    //     SAFE_ADDRESS, // Safe contract used to store DX funds if enabled
    //     SAFE_COMPLETE_MODULE_CONTRACT_ADDRESS, // Safe module which interacts with DX and Safe
    //     SAFE_SELLER_MODULE_CONTRACT_ADDRESS // Safe module which interacts with DX and Safe
    //   } = conf
  
    //   // Add extra args related with the Safe
    //   instanceArgs = Object.assign(
    //     {},
    //     instanceArgs,
    //     {
    //       safeAddress: SAFE_ADDRESS,
    //       safeCompleteModuleAddress: SAFE_COMPLETE_MODULE_CONTRACT_ADDRESS,
    //       safeSellerModuleAddress: SAFE_SELLER_MODULE_CONTRACT_ADDRESS
    //     }
    //   )
    // }

    const contractLoader = new ContractLoader(instanceArgs)
    contracts = await contractLoader.loadContracts()
  }

  return contracts
}

module.exports = loadContracts