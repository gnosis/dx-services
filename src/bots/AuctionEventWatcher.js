const loggerNamespace = 'dx-service:bots:AuctionEventWatcher'
const Logger = require('../helpers/Logger')
const logger = new Logger(loggerNamespace)
const AuctionLogger = require('../helpers/AuctionLogger')
const auctionLogger = new AuctionLogger(loggerNamespace)
const ethereumEventHelper = require('../helpers/ethereumEventHelper')
const events = require('../helpers/events')

class AuctionEventWatcher {
  constructor ({ eventBus, markets, contracts }) {
    this._eventBus = eventBus
    this._markets = markets
    this._contracts = contracts

    this._knownMarkets = markets.map(_toMarketDescriptor)
    this._watchingFilter = null
    this._tokenContracts = Object.assign({}, contracts.erc20TokenContracts, {
      ETH: contracts.eth,
      TUL: contracts.tul,
      OWL: contracts.owl,
      GNO: contracts.gno
    })

    const tokenNames = Object.keys(this._tokenContracts)
    this._tokenNamesByAddress = tokenNames.reduce((tokenNamesByAddress, tokenName) => {
      const address = this._tokenContracts[tokenName].address
      tokenNamesByAddress[address] = tokenName
      return tokenNamesByAddress
    }, {})
  }

  async start () {
    logger.info('Start to follow the markets [%o]...', this._knownMarkets.join(', '))
    const that = this

    this._watchingFilter = ethereumEventHelper.watch({
      contract: this._contracts.dx,
      fromBlock: 'latest',
      toBlock: 'latest',
      callback (error, eventData) {
        that._handleEvent(error, eventData)
      }
      /*,
      events: [
        'AuctionCleared',
        'NewDeposit',
        'NewWithdrawal',
        'NewSellOrder',
        'NewBuyOrder',
        'NewSellerFundsClaim',
        'NewBuyerFundsClaim',
        'NewTokenPair',
        'AuctionCleared',
        'Log',
        'LogOustandingVolume',
        'LogNumber',
        'ClaimBuyerFunds'
      ]
      */
    })
  }

  async stop () {
    logger.info('Stopping the auction watch...')
    this._watchingFilter.stopWatching()
    this._watchingFilter = null
    logger.info('Stopped watching for events')
  }

  _handleEvent (error, eventData) {
    if (error) {
      logger.error('Error watching events: ' + error.toString())
      console.error(error)
    } else {
      switch (eventData.event) {
        case 'AuctionCleared':
          this._onAuctionCleared(eventData)
          break
        default:
          logger.debug('Got event %s - %o', eventData.event, eventData)
      }
    }
  }

  _onAuctionCleared (eventData) {
    const { sellToken, buyToken, sellVolume, buyVolume, auctionIndex } = eventData.args
    const tokenA = this._tokenNamesByAddress[sellToken]
    const tokenB = this._tokenNamesByAddress[buyToken]

    let tokensAreKnown, market
    if (tokenA && tokenB) {
      market = _toMarketDescriptor({ tokenA, tokenB })
      tokensAreKnown = this._knownMarkets.includes(market)
    } else {
      tokensAreKnown = false
    }

    // Check if the cleared auction is of a known market
    if (tokensAreKnown) {
      auctionLogger.info(tokenA, tokenB, 'One auction cleared: %s-%s')
      this._eventBus.trigger(events.EVENT_AUCTION_CLRARED, {
        sellToken: tokenA,
        buyToken: tokenB,
        sellVolume,
        buyVolume,
        auctionIndex: auctionIndex.toNumber()
      })
    } else {
      auctionLogger.error(sellToken, buyToken,
        'One auction cleared, but it was for a known pair: %s-%s'
      )
    }
  }
}

function _toMarketDescriptor ({ tokenA, tokenB }) {
  if (tokenA < tokenB) {
    return tokenA + '-' + tokenB
  } else {
    return tokenB + '-' + tokenA
  }
}

module.exports = AuctionEventWatcher
