const loggerNamespace = 'dx-service:services:indexer'
const Logger = require('../../../helpers/Logger')
// const formatUtil = require('../../../helpers/formatUtil')
const logger = new Logger(loggerNamespace)
// const assert = require('assert')

class IndexerService {
  constructor ({
    auctionRepo,
    ethereumRepo
  } = {}) {
    this._auctionRepo = auctionRepo
    this._ethereumRepo = ethereumRepo
    logger.info('Loading indexer')
  }

  async _indexTokenPairs () {
    const tokenPairs = await this._auctionRepo.getTokenPairs()

    tokenPairs.forEach(tokenPair => {
      logger.info('%O', tokenPair)
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
    orders.forEach(order => {
      logger.info('%O', order)
      // TODO: Persist using a new DAO
    })
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

  async indexEvents ({
    forzeFullIndex = false,
    numConfirmations = 10
  }) {
    let filteredBlocks
    if (forzeFullIndex) {
      filteredBlocks = {
        fromBlock: 0,
        toBlock: 3840489 // Get last block - X Blocks (confirmations)
      }
    } else {
      filteredBlocks = {
        fromBlock: 3800000,
        toBlock: 3840489
      }
    }
    // 1. Index Token Pairs
    // await this._indexTokenPairs(filteredBlocks)

    // 2. Index Auctions
    // TODO:
    // Iterate over all blocks
    // await this._indexAuctionStart(filteredBlocks)
    // await this._indexClearedAuctions(filteredBlocks)

    // 3. Index orders and claimings
    // await this._indexSellOrders(filteredBlocks)
    // await this._indexBuyOrders(filteredBlocks)
    // await this._indexFees(filteredBlocks)
    // await this._indexClaimedFundsSeller(filteredBlocks)
    // await this._indexClaimedFundsBuyer(filteredBlocks)

    // getAuctions // cleared auctions
    // getSellOrders
    // getBuyOrders
    // getFees
    // _getOrders
    // getClaimedFundsSeller
    // getClaimedFundsBuyer
  }
}
module.exports = IndexerService
