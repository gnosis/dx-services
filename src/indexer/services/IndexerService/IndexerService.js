const loggerNamespace = 'dx-service:services:indexer'
const Logger = require('../../../helpers/Logger')
// const formatUtil = require('../../../helpers/formatUtil')
const logger = new Logger(loggerNamespace)
// const assert = require('assert')

// const IDEXING_BATCH_SIZE = 10000
const IDEXING_BATCH_SIZE = 100000
const RETRY_WAIT_TIME = 1000

// TODO: Remove
let auctions = []
let sellOrders = []
let buyOrders = []
let owlBurns = []

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
      // DutchX 2
      // initalBlock = 7189412 // Get last processed block from database
      // endBlock = 7374901 // Get last block - X Blocks (confirmations)

      // DutchX 2
      initalBlock = 5875590 // Get last processed block from database
      endBlock = 7374901 // Get last block - X Blocks (confirmations)
    }

    const totalNumBatches = Math.ceil((endBlock - initalBlock) / IDEXING_BATCH_SIZE)
    let batchNumber = 0
    for (let fromBlock = initalBlock; fromBlock < endBlock; fromBlock += IDEXING_BATCH_SIZE) {
      batchNumber++
      const toBlock = fromBlock + IDEXING_BATCH_SIZE - 1
      logger.info('[Batch %d/%d]: From block %d to %d', batchNumber, totalNumBatches, fromBlock, toBlock)

      const indexBlockRangeFunc = async () => {
        await this._doIndexEvents({
          fromBlock,
          toBlock
        })
      }
      // await indexBlockRangeFunc()
      //   .then(() => console.log('Nice!'))
      //   .catch(() => console.log('Not nice!'))

      await doWithRetry(`Batch ${batchNumber}/${totalNumBatches}`, indexBlockRangeFunc, 1, 5)
    }

    // const sellAmountsByToken = sellOrders.reduce((acc, order) => {
    //   const {
    //     sellToken,
    //     amount
    //   } = order

    //   let tokenAmount = acc[sellToken]
    //   const amountNumber = amount.toNumber()
    //   // logger.info('%s-%s: %d', sellToken, buyToken, amountNumber)
    //   if (!tokenAmount) {
    //     tokenAmount = amountNumber
    //     acc[sellToken] = tokenAmount
    //   } else {
    //     acc[sellToken] = tokenAmount + amountNumber
    //   }

    //   return acc
    // }, {})
    // logger.info('sellAmountsByToken: %O', sellAmountsByToken)

    // const buyAmountsByToken = buyOrders.reduce((acc, order) => {
    //   const {
    //     buyToken,
    //     amount
    //   } = order

    //   let tokenAmount = acc[buyToken]
    //   const amountNumber = amount.toNumber()
    //   // logger.info('%s-%s: %d', sellToken, buyToken, amountNumber)
    //   if (!tokenAmount) {
    //     tokenAmount = amountNumber
    //     acc[buyToken] = tokenAmount
    //   } else {
    //     acc[buyToken] = tokenAmount + amountNumber
    //   }

    //   return acc
    // }, {})
    // logger.info('buyAmountsByToken: %O', buyAmountsByToken)

    // const usersCount = buyOrders.concat(sellOrders).reduce((acc, order) => {
    //   const {
    //     user
    //   } = order

    //   let userCount = acc[user]
    //   // logger.info('%s-%s: %d', sellToken, buyToken, amountNumber)
    //   if (!acc[user]) {
    //     acc[user] = 1
    //   } else {
    //     acc[user] = userCount + 1
    //   }

    //   return acc
    // }, [])
    // const users = Object
    //   .keys(usersCount)
    //   .map(account => ({
    //     account,
    //     count: usersCount[account]
    //   }))
    //   .sort((u1, u2) => u2.count - u1.count)

    // logger.info('users:\n%s', users.map(u => `${u.account}: ${u.count}`).join('\n'))
    // logger.info('TOTAL: %d', users.length)

    // const owlBurnByContract = owlBurns.reduce((acc, order) => {
    //   const {
    //     from,
    //     user,
    //     amount
    //   } = order
    //   const amountNumber = amount.div(1e18).toNumber()

    //   let burns = acc[from]
    //   if (!burns) {
    //     burns = {}
    //     acc[from] = burns
    //   }

    //   let owlAmount = burns[user]
    //   if (!owlAmount) {
    //     owlAmount = amountNumber
    //     burns[user] = owlAmount
    //   } else {
    //     burns[user] = owlAmount + amountNumber
    //   }

    //   return acc
    // }, {})
    // Object.keys(owlBurnByContract).forEach(from => {
    //   const owlBurnByUser = owlBurnByContract[from]
    //   const users = Object.keys(owlBurnByUser)
    //   console.log('\n\n-------------------------------\nOwl burned by: %s', from)
    //   console.log('BURNS:\n%s', users.map(user => `${user}: ${owlBurnByUser[user]}`).join('\n'))
    //   console.log('TOTAL BURNS: ', users.length)
    //   console.log('TOTAL OWL BURNT: ', users.map(user => owlBurnByUser[user]).reduce((acc, amount) => {
    //     return acc + amount
    //   }, 0))
    // })

    logger.info('Auctions: %d', auctions.length)
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
    const auctionsAux = await this._indexClearedAuctions(blockRange)
    console.log('Cleared %d auctions', auctionsAux.length)
    auctions = auctions.concat(auctionsAux)

    // 3. Index orders and claimings
    const indexPromises = []

    // // 3.1 Index sell orders
    // const indexSellOrdersPromise = this._indexSellOrders(blockRange)
    // indexSellOrdersPromise.then(orders => {
    //   sellOrders = sellOrders.concat(orders)
    // })
    // indexPromises.push(indexSellOrdersPromise)

    // const indexBuyOrdersPromise = this
    //   ._indexBuyOrders(blockRange)
    //   .then(orders => {
    //     buyOrders = buyOrders.concat(orders)
    //   })
    // indexPromises.push(indexBuyOrdersPromise)

    // const indexOwlBurnsPromise = this
    //   ._indexOwlBurn(blockRange)
    //   .then(burns => {
    //     owlBurns = owlBurns.concat(burns)
    //   })
    // indexPromises.push(indexOwlBurnsPromise)

    // await this._indexBuyOrders(blockRange)
    // await this._indexFees(blockRange)
    // await this._indexClaimedFundsSeller(blockRange)
    // await this._indexClaimedFundsBuyer(blockRange)
    // Burn owl?

    // Wait for all orders and claimings promises
    return Promise.all(indexPromises)
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

    return auctions
  }

  async _indexClearedAuctions ({
    fromBlock,
    toBlock
  }) {
    const auctions = await this._auctionRepo.getClearedAuctions({
      fromBlock,
      toBlock
    })
    // auctions.forEach(auction => {
    //   // const { sellToken, buyToken, sellVolume, buyVolume, auctionIndex } = auction
    //   // logger.info(`\nAuction Cleared:\n`, {
    //   //   sellToken: sellToken.valueOf(),
    //   //   buyToken: buyToken.valueOf(),
    //   //   sellVolume: sellVolume.valueOf(),
    //   //   buyVolume: buyVolume.valueOf(),
    //   //   auctionIndex: auctionIndex.valueOf()
    //   // })
    //   logger.info('%O', auction)
    //   // TODO: Persist using a new DAO
    // })

    return auctions
  }

  async _indexSellOrders ({
    fromBlock,
    toBlock
  }) {
    const orders = await this._auctionRepo.getSellOrders({
      fromBlock,
      toBlock
    })
    // orders.forEach(order => {
    //   logger.info('%O', order)
    //   // TODO: Persist using a new DAO
    // })

    // TODO: Persis Sell orders

    return orders
  }

  async _indexOwlBurn ({
    fromBlock,
    toBlock
  }) {
    const burns = await this._auctionRepo.getBurnedOwl({
      fromBlock,
      toBlock
    })
    // console.log('%d burns!', burns.length)
    // burns.forEach(burn => {
    //   logger.info('%O', burn)
    //   // TODO: Persist using a new DAO
    // })

    // TODO: Persis Sell orders

    return burns
  }

  async _indexBuyOrders ({
    fromBlock,
    toBlock
  }) {
    const orders = await this._auctionRepo.getBuyOrders({
      fromBlock,
      toBlock
    })
    // orders.forEach(order => {
    //   logger.info('%O', order)
    //   // TODO: Persist using a new DAO
    // })

    return orders
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

    return fees
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

    return claimings
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

    return claimings
  }
}

async function doWithRetry (name, func, attempt, totalAttempts) {
  return func().catch(error => {
    console.error(`[${name}] Error: ${error.message}`)

    if (attempt > totalAttempts) {
      console.error(`Not more attempts availible`)
      throw error
    }

    // Retry in some time
    const waitTime = attempt * attempt * attempt * RETRY_WAIT_TIME
    console.error(`Attempt ${attempt} of ${totalAttempts}. Retry in ${waitTime / 1000} seconds`)

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        doWithRetry(name, func, attempt + 1, totalAttempts)
          .then(resolve)
          .catch(reject)
      }, waitTime)
    })
  })
}

module.exports = IndexerService
