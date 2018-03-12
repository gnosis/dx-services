const loggerNamespace = 'dx-service:bots:AuctionEventWatcher'
const Logger = require('../helpers/Logger')
const logger = new Logger(loggerNamespace)
const AuctionLogger = require('../helpers/AuctionLogger')
const auctionLogger = new AuctionLogger(loggerNamespace)
const ethereumEventHelper = require('../helpers/ethereumEventHelper')
const events = require('../helpers/events')

const RETRY_WATCH_EVENTS_MILLISECONDS = 4 * 1000
/*
const EVENTS_TO_LISTEN = [
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
    this._doWatch()
  }

  async stop () {
    logger.info('Stopping the auction watch...')
    this._watchingFilter.stopWatching()
    this._watchingFilter = null
    logger.info('Stopped watching for events')
  }

  _doWatch () {
    logger.info('Start to follow the markets [%o]...', this._knownMarkets.join(', '))
    const that = this
    try {
      this._watchingFilter = ethereumEventHelper.watch({
        contract: this._contracts.dx,
        fromBlock: 'latest',
        toBlock: 'latest',
        callback (error, eventData) {
          that._handleEvent(error, eventData)
        }
        //, events: EVENTS_TO_LISTEN
      })
    } catch (error) {
      logger.error('Error watching events: ' + error.toString())
      if (this._watchingFilter !== null) {
        // If there was a watchingFilter, means that we were watching
        // succesfully for events, but somthing happend (i.e. we lost connection)
        //  * In this case we retry in some seconds
        console.error(error)
        if (this._watchingFilter) {
          try {
            this._watchingFilter.stopWatching()
          } catch (errorStoppingWatch) {
            logger.error(`Error when trying stop watching events (handling an \
  error watching the blockchain): ` + errorStoppingWatch.toString())
            console.error(errorStoppingWatch)
          }
        }

        this._watchingFilter = null
        logger.error('Retrying to connect in %d seconds', RETRY_WATCH_EVENTS_MILLISECONDS / 1000)
        setTimeout(() => {
          this._doWatch()
        }, RETRY_WATCH_EVENTS_MILLISECONDS)
      } else {
        // If we don't have a watchingFilter, means that the first watch failed
        //  * In this case we rethrow the error (so the app won't boot)
        throw error
      }
    }
  }

  _handleEvent (error, eventData) {
    logger.debug('Got event %s - %o', eventData.event, eventData)
    if (error) {
      logger.error('Error watching events: ' + error.toString())
      console.error(error)
    } else {
      switch (eventData.event) {
        case 'AuctionCleared':
          this._onAuctionCleared(eventData)
          break
        default:
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
      auctionLogger.info(tokenA, tokenB, 'The auction has cleared')
      this._eventBus.trigger(events.EVENT_AUCTION_CLEARED, {
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
