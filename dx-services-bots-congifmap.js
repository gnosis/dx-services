apiVersion: v1
kind: ConfigMap
metadata:
  name: '{{ .configMapName }}'
  namespace: '{{ .namespace }}'
  labels:
    app: '{{ .configMapName }}'
    env: 'dev'
    network: '{{ .ethereumNetwork }}'
data:
  custom-config.js: |
    const CONTRACTS_BASE_DIR = 'node_modules/@gnosis.pm/dx-contracts/build/contracts' // 'build/contracts'
    const CONTRACTS_SAFE_MODULE_DIR = 'node_modules/gnosis-safe-modules/build/contracts'
    const CONTRACTS_ARBITRAGE_DIR = 'node_modules/@okwme/arbitrage/build/contracts'

    const BOT_MARKETS = [
      { tokenA: 'RDN', tokenB: 'WETH' },
      { tokenA: 'OMG', tokenB: 'WETH' }
    ]
    // const BOT_TOKENS = ['RDN', 'WETH']

    const MAIN_BOT_ACCOUNT = 0
    // const BACKUP_BOT_ACCOUNT = 1

    // To enable the SafeModule, please add the properties: Safe, SafeDXCompleteModule, SafeDXSellerModule
    // and export their addresses
    const CONTRACT_DEFINITIONS = {
      ArbitrageContract: CONTRACTS_ARBITRAGE_DIR + '/Arbitrage',
      UniswapFactory: CONTRACTS_ARBITRAGE_DIR + '/IUniswapFactory',
      UniswapExchange: CONTRACTS_ARBITRAGE_DIR + '/IUniswapExchange',
  
      GnosisStandardToken: CONTRACTS_BASE_DIR + '/GnosisStandardToken',
      DutchExchange: CONTRACTS_BASE_DIR + '/DutchExchange',
      PriceOracleInterface: CONTRACTS_BASE_DIR + '/PriceOracleInterface',
      DutchExchangeProxy: CONTRACTS_BASE_DIR + '/DutchExchangeProxy',
      DutchExchangeHelper: CONTRACTS_BASE_DIR + '/DutchExchangeHelper',
      EtherToken: CONTRACTS_BASE_DIR + '/EtherToken',
      TokenFRT: CONTRACTS_BASE_DIR + '/TokenFRT',
      TokenFRTProxy: CONTRACTS_BASE_DIR + '/TokenFRTProxy',
      TokenOWL: CONTRACTS_BASE_DIR + '/TokenOWL',
      TokenOWLProxy: CONTRACTS_BASE_DIR + '/TokenOWLProxy',
      TokenGNO: CONTRACTS_BASE_DIR + '/TokenGNO',
      Safe: CONTRACTS_SAFE_MODULE_DIR + '/GnosisSafe',
      SafeDXCompleteModule: CONTRACTS_SAFE_MODULE_DIR + '/DutchXCompleteModule',
      SafeDXSellerModule: CONTRACTS_SAFE_MODULE_DIR + '/DutchXSellerModule'
    }

    const SAFE_MODULE_ADDRESSES = {
      SAFE_ADDRESS: '0x8e1e8d01d0a8c147af165bbf283edce8eb7a6a57',
      SAFE_COMPLETE_MODULE_CONTRACT_ADDRESS: '0x67bc8b64530ba21373d79f98ecef6846c9ab6726',
      SAFE_SELLER_MODULE_CONTRACT_ADDRESS: '0xaadee288424f20e5023b9204882454a95b2fadf4' // uncomment and set the address in order to enable the seller module
    }

    // botAddress: '0x8e1e8d01d0a8c147af165bbf283edce8eb7a6a57' - it's the Safe
    // operator: '0xbcC87B421E19b151C3Af5D46a27AF986211119e9'


    // Bots config
    const notifications = [{
      type: 'slack',
      channel: 'GA5J9F13J' // dx-bots-dev
    }]


    // Watch events and notify the event bus
    //   - Other bots, like the sell bot depends on it
    const WATCH_EVENTS_BOT = {
      name: '[Safe] Watch events bot',
      markets: BOT_MARKETS,
      factory: 'src/bots/WatchEventsBot'
    }

    // Arbitrage bot
    const ARB_BOT = {
      name: 'Arbitrage bot',
      factory: 'src/bots/ArbitrageBot',
      markets: BOT_MARKETS,
      accountIndex: MAIN_BOT_ACCOUNT,
      // rules: BUY_LIQUIDITY_RULES_DEFAULT,
      notifications,
      checkTimeInMilliseconds: 60 * 1000 // 60s
    }

    module.exports = {
      MAIN_BOT_ACCOUNT,
      BOTS:[
        ARB_BOT,
        WATCH_EVENTS_BOT
      ],
      MARKETS: BOT_MARKETS,
      CONTRACTS_BASE_DIR,
      CONTRACT_DEFINITIONS
    }
