const loggerNamespace = 'dx-service:services:indexer'
const Logger = require('../../../helpers/Logger')
// const formatUtil = require('../../../helpers/formatUtil')
const logger = new Logger(loggerNamespace)
// const assert = require('assert')

const IDEXING_BATCH_SIZE = 10000

// TODO: Remove
let sellOrders = []

class IndexerService {
  constructor ({
    auctionRepo,
    ethereumRepo
  } = {}) {
    this._auctionRepo = auctionRepo
    this._ethereumRepo = ethereumRepo
    logger.info('Loading indexer')
  }

  async indexEvents ({
    forzeFullIndex = false,
    numConfirmations = 10
  } = {}) {
    let initalBlock, endBlock
    if (forzeFullIndex) {
      // Full sync
      initalBlock = 0
      endBlock = 3840489 // Get last block - X Blocks (confirmations)
    } else {
      // Continue sync
      initalBlock = 7200000 // Get last processed block from database
      // endBlock = 7220000 // Get last processed block from database
      endBlock = 7374901 // Get last block - X Blocks (confirmations)
    }

    const totalNumBatches = Math.ceil((endBlock - initalBlock) / IDEXING_BATCH_SIZE)
    let batchNumber = 0
    for (let fromBlock = initalBlock; fromBlock < endBlock; fromBlock += IDEXING_BATCH_SIZE) {
      batchNumber++
      const toBlock = fromBlock + IDEXING_BATCH_SIZE - 1
      logger.info('Indexing %d/%d: From block %d to %d', batchNumber, totalNumBatches, fromBlock, toBlock)

      await this._doIndexEvents({
        fromBlock,
        toBlock
      })
    }

    const sellAmountsByToken = sellOrders.reduce((acc, order) => {
      const {
        sellToken,
        buyToken,
        amount
      } = order

      let tokenAmount = acc[sellToken]
      const amountNumber = amount.toNumber()
      // logger.info('%s-%s: %d', sellToken, buyToken, amountNumber)
      if (!tokenAmount) {
        tokenAmount = amountNumber
        acc[sellToken] = tokenAmount
      } else {
        acc[sellToken] = tokenAmount + amountNumber
      }

      return acc
    }, {})

    logger.info('%O', sellAmountsByToken)
  }

  async _doIndexEvents ({
    fromBlock,
    toBlock
  }) {
    const blockRange = {
      fromBlock,
      toBlock
    }

    // 1. Index Token Pairs
    // await this._indexTokenPairs(blockRange)

    // 2. Index Auctions
    // TODO:
    // Iterate over all blocks
    // await this._indexAuctionStart(blockRange)
    // await this._indexClearedAuctions(blockRange)

    // 3. Index orders and claimings
    await this._indexSellOrders(blockRange)
    // await this._indexBuyOrders(blockRange)
    // await this._indexFees(blockRange)
    // await this._indexClaimedFundsSeller(blockRange)
    // await this._indexClaimedFundsBuyer(blockRange)

    // getAuctions // cleared auctions
    // getSellOrders
    // getBuyOrders
    // getFees
    // _getOrders
    // getClaimedFundsSeller
    // getClaimedFundsBuyer
  }

  async _indexTokenPairs ({
    fromBlock,
    toBlock
  }) {
    const tokenPairs = await this._auctionRepo.getTokenPairs({
      fromBlock,
      toBlock
    })

    tokenPairs.forEach(tokenPair => {
      // logger.info('%O', tokenPair)
      const {
        ethInfo,
        sellToken,
        buyToken
      } = tokenPair
      logger.info('[%d] %s-%s', ethInfo.blockNumber, sellToken, buyToken)
      // TODO: Persist using a new DAO
    })
  }

  async _indexAuctionStart ({
    fromBlock,
    toBlock
  }) {
    const auctions = await this._auctionRepo
      .getAuctionStartScheduledEvents({
        fromBlock,
        toBlock
      })
    auctions.forEach(auction => {
      // const { ethInfo, sellToken, buyToken, auctionIndex, auctionStart, auctionStartScheduled } = auction
      // logger.info(`\n[block %d] Auction %s-%s-%d scheduled on %s. Start time: %s\n`,
      //   ethInfo.blockNumber,
      //   sellToken.valueOf(),
      //   buyToken.valueOf(),
      //   auctionIndex.toNumber(),
      //   formatUtil.formatDateTime(auctionStartScheduled),
      //   formatUtil.formatDateTime(auctionStart)
      // )
      logger.info('%O', auction)
      // TODO: Persist using a new DAO
    })
  }

  async _indexClearedAuctions ({
    fromBlock,
    toBlock
  }) {
    const auctions = await this._auctionRepo.getClearedAuctions({
      fromBlock,
      toBlock
    })
    auctions.forEach(auction => {
      // const { sellToken, buyToken, sellVolume, buyVolume, auctionIndex } = auction
      // logger.info(`\nAuction Cleared:\n`, {
      //   sellToken: sellToken.valueOf(),
      //   buyToken: buyToken.valueOf(),
      //   sellVolume: sellVolume.valueOf(),
      //   buyVolume: buyVolume.valueOf(),
      //   auctionIndex: auctionIndex.valueOf()
      // })
      logger.info('%O', auction)
      // TODO: Persist using a new DAO
    })
  }

  async _indexSellOrders ({
    fromBlock,
    toBlock
  }) {
    const orders = await this._auctionRepo.getSellOrders({
      fromBlock,
      toBlock
    })
    sellOrders = sellOrders.concat(orders)
    // orders.forEach(order => {
    //   logger.info('%O', order)
    //   // TODO: Persist using a new DAO
    // })
  }

  async _indexBuyOrders ({
    fromBlock,
    toBlock
  }) {
    const orders = await this._auctionRepo.getBuyOrders({
      fromBlock,
      toBlock
    })
    orders.forEach(order => {
      logger.info('%O', order)
      // TODO: Persist using a new DAO
    })
  }

  async _indexFees ({
    fromBlock,
    toBlock
  }) {
    const fees = await this._auctionRepo.getFees({
      fromBlock,
      toBlock
    })
    fees.forEach(fee => {
      logger.info('%O', fee)
      // TODO: Persist using a new DAO
    })
  }

  async _indexClaimedFundsSeller ({
    fromBlock,
    toBlock
  }) {
    const claimings = await this._auctionRepo.getClaimedFundsSeller({
      fromBlock,
      toBlock
    })
    claimings.forEach(claim => {
      logger.info('%O', claim)
      // TODO: Persist using a new DAO
    })
  }

  async _indexClaimedFundsBuyer ({
    fromBlock,
    toBlock
  }) {
    const claimings = await this._auctionRepo.getClaimedFundsBuyer({
      fromBlock,
      toBlock
    })
    claimings.forEach(claim => {
      logger.info('%O', claim)
      // TODO: Persist using a new DAO
    })
  }
}
module.exports = IndexerService
