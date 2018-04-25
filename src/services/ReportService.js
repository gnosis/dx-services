const loggerNamespace = 'dx-service:services:ReportService'
const Logger = require('../helpers/Logger')
const getBotAddress = require('../helpers/getBotAddress')
const logger = new Logger(loggerNamespace)
const formatUtil = require('../helpers/formatUtil')
const AuctionsReportRS = require('./helpers/AuctionsReportRS')
const getTokenOrder = require('../helpers/getTokenOrder')
const numberUtil = require('../helpers/numberUtil')

const assert = require('assert')
let requestId = 1

// const AuctionLogger = require('../helpers/AuctionLogger')
// const auctionLogger = new AuctionLogger(loggerNamespace)
// const ENVIRONMENT = process.env.NODE_ENV

class ReportService {
  constructor ({ auctionRepo, ethereumRepo, markets, slackClient, config }) {
    this._auctionRepo = auctionRepo
    this._ethereumRepo = ethereumRepo
    this._markets = markets
    this._slackClient = slackClient
    this._auctionsReportSlackChannel = config.SLACK_CHANNEL_AUCTIONS_REPORT
    this._markets = config.MARKETS

    this._botAddressPromise = getBotAddress(ethereumRepo._ethereumClient)
  }

  async getAuctionsReportInfo ({ fromDate, toDate }) {
    _assertDatesOverlap(fromDate, toDate)

    return new Promise((resolve, reject) => {
      const auctions = []
      this._generateAuctionInfoByDates({
        fromDate,
        toDate,
        addAuctionInfo (auctionInfo) {
          // logger.debug('Add auction info: ', auctionInfo)
          auctions.push(auctionInfo)
        },
        end (error) {
          logger.debug('Finish getting the info: ', error ? 'Error' : 'Success')
          if (error) {
            reject(error)
          } else {
            resolve(auctions)
          }
        }
      })
    })
  }

  async getAuctionsReportFile ({ fromDate, toDate }) {
    _assertDatesOverlap(fromDate, toDate)

    logger.info('Generate auction report from "%s" to "%s"',
      formatUtil.formatDateTime(fromDate),
      formatUtil.formatDateTime(toDate)
    )

    const auctionsReportRS = new AuctionsReportRS()
    this._generateAuctionInfoByDates({
      fromDate,
      toDate,
      addAuctionInfo (auctionInfo) {
        // logger.debug('Add auction into report: ', auctionInfo)
        auctionsReportRS.addAuction(auctionInfo)
      },
      end (error) {
        logger.debug('Finished report: ', error ? 'Error' : 'Success')
        if (error) {
          auctionsReportRS.end(error)
        } else {
          auctionsReportRS.end()
        }
      }
    })

    return {
      name: 'auctions-reports.csv',
      mimeType: 'text/csv',
      content: auctionsReportRS
    }
  }

  sendAuctionsReportToSlack ({ fromDate, toDate, senderInfo }) {
    _assertDatesOverlap(fromDate, toDate)

    const id = requestId++
   
    // Generate report file and send it to slack (fire and forget)
    logger.info('[requestId=%d] Generating report between "%s" and "%s" requested by "%s"...',
      id, formatUtil.formatDateTime(fromDate), formatUtil.formatDateTime(toDate),
      senderInfo
    )
    this._doSendAuctionsReportToSlack({ id, senderInfo, fromDate, toDate })
      .then(() => {
        logger.info('The auctions report was sent to slack')
      })
      .catch(error => {
        logger.error({
          msg: '[requestId=%d] Error generating and sending the auctions report to slack: %s',
          params: [ id, error.toString() ],
          error
        })
      })

    // Return the request id and message
    logger.info('[requestId=%d] Returning a receipt', id)
    return {
      message: 'The report request has been submited',
      id
    }
  }

  _generateAuctionInfoByDates ({ fromDate, toDate, addAuctionInfo, end }) {
    this
      // Get events info
      ._getAuctionsEventInfo({ fromDate, toDate, addAuctionInfo })
      .then(() => {
        logger.info('All info was generated')
        end()
      })
      .catch(end)
  }

  async _getAuctionsEventInfo ({ fromDate, toDate, addAuctionInfo }) {
    const [ fromBlock, toBlock, botAddres ] = await Promise.all([
      this._ethereumRepo.getFirstBlockAfterDate(fromDate),
      this._ethereumRepo.getLastBlockBeforeDate(toDate),
      this._botAddressPromise
    ])

    // Get cleared auctions to select the auctions
    const auctions = await this._auctionRepo
      .getClearedAuctions({
        fromBlock,
        toBlock
      })

    // Get aditional info of the auction
    let auctionsInfo = await Promise.all(
      auctions
        .filter(({ sellTokenSymbol, buyTokenSymbol }) => {
          // Remove the unknown markets
          return this._isKnownMarket(sellTokenSymbol, buyTokenSymbol)
        })
        .map(async auction => {
          // Get aditional info: auction start, closingPrice
          const { sellToken, buyToken, auctionIndex } = auction
          // const [ auctionStart, closingPrice ] = await Promise.all([
          //   // Get auction start
          //   // FIXME: auctionStart is more dificult ot get the following fn gets just the lastone
          //   // TODO: Maybe a better aproach is to get a starting block that takes the endDate and goes a safe amount time back
          //   // this._auctionRepo.getAuctionStart({ sellToken, buyToken }),
            
          // ])

          const [ closingPrice, previousClosingPrice ] = await Promise.all([
            // Get closing price
            this._auctionRepo.getClosingPrices({
              sellToken,
              buyToken,
              auctionIndex
            }),

            // Get the previous closing price
            this._auctionRepo.getClosingPrices({
              sellToken,
              buyToken,
              auctionIndex: auction.auctionIndex - 1
            })
          ])

          return Object.assign(auction, {
            // TODO: auctionStart
            closingPrice,
            previousClosingPrice
          })
        })
    )

    // Get the start of the first of the auctions
    const startOfFirstAuction = auctionsInfo
      .map(auctionsInfo => auctionsInfo.auctionStart)
      .reduce((earlierAuctionStart, auctionStart) => {
        if (earlierAuctionStart === null || earlierAuctionStart > auctionStart) {
          return auctionStart
        } else {
          return earlierAuctionStart
        }
      }, null)

    // Get the block associated with the start
    let fromBlockStartAuctions
    if (startOfFirstAuction) {
      fromBlockStartAuctions = await this._ethereumRepo
        .getFirstBlockAfterDate(startOfFirstAuction)
    }

    // We start in the earliest block (this is relevant for strange cases,
    // especially for development with ganache-cli, where the ClearAuction event
    // might be mined before the auction start date, otherwise the
    // fromBlockStartAuctions is the earliest block)
    fromBlockStartAuctions = Math.min(
      fromBlock,
      fromBlockStartAuctions || fromBlock
    )
    
    // Get bot orders
    const [ botSellOrders, botBuyOrders ] = await Promise.all([
      // Get the bot's sell orders
      this._auctionRepo.getSellOrders({
        fromBlock: fromBlockStartAuctions,
        toBlock,
        user: botAddres
      }),

      // Get the bot's buy orders
      this._auctionRepo.getBuyOrders({
        fromBlock: fromBlockStartAuctions,
        toBlock,
        user: botAddres
      })
    ])

    // Get info for every token pair
    const generateInfoPromises = this
      ._markets
      .map(({ tokenA, tokenB }) => {
        return this._generateAuctionInfoByMarket({
          fromDate,
          toDate,
          tokenA,
          tokenB,
          auctionsInfo,
          botBuyOrders,
          botSellOrders,
          addAuctionInfo
        })
      })

    return Promise.all(generateInfoPromises)
  }

  _isKnownMarket (tokenA, tokenB) {
    if (tokenA && tokenB) {
      const [ sellToken, buyToken ] = getTokenOrder(tokenA, tokenB)

      return this._markets.some(market => {
        return market.tokenA === sellToken &&
          market.tokenB === buyToken
      })
    } else {
      return false
    }
  }

  async _generateAuctionInfoByMarket ({
    fromDate,
    toDate,
    tokenA,
    tokenB,
    auctionsInfo,
    botBuyOrders,
    botSellOrders,
    addAuctionInfo
  }) {
    if (auctionsInfo.length > 0) {
      logger.info('Get auctions for %s-%s between %s and %s',
        tokenA,
        tokenB,
        formatUtil.formatDateTime(fromDate),
        formatUtil.formatDateTime(toDate)
      )
      const generateInfoPromises = auctionsInfo
        .map(auction => {
          const { sellToken, buyToken, auctionIndex } = auction

          function filterOrder (order) {
            return order.auctionIndex.equals(auctionIndex) &&
              order.sellToken === sellToken &&
              order.buyToken === buyToken
          }

          logger.debug('Get information for auction %s of %s-%s',
            auctionIndex,
            sellToken,
            buyToken
          )

          const auctionInfoWithOrders = Object.assign(auction, {
            botBuyOrders: botBuyOrders.filter(filterOrder),
            botSellOrders: botSellOrders.filter(filterOrder),
            addAuctionInfo
          })

          return this._generateAuctionInfo(auctionInfoWithOrders)
        })
      return Promise.all(generateInfoPromises)
    } else {
      logger.info('There are no auctions for %s-%s between %s and %s',
        tokenA,
        tokenB,
        formatUtil.formatDateTime(fromDate),
        formatUtil.formatDateTime(toDate)
      )
    }
  }

  async _generateAuctionInfo ({
    sellToken,
    buyToken,
    sellTokenSymbol,
    buyTokenSymbol,
    auctionIndex,
    botSellOrders,
    botBuyOrders,
    buyVolume,
    sellVolume,
    closingPrice,
    previousClosingPrice,
    addAuctionInfo
  }) {
    logger.info('Get info: %O', arguments[0])

    function sumOrdersVolumes (botSellOrders) {
      return botSellOrders
        .map(order => order.amount)
        .reduce((sum, amount) => {
          return sum.plus(amount)
        }, numberUtil.toBigNumber(0))
    }

    const botSellVolume = sumOrdersVolumes(botSellOrders)
    const botBuyVolume = sumOrdersVolumes(botBuyOrders)
    const ensuredSellVolumePercentage = sellVolume.isZero() ? null : botSellVolume.div(sellVolume).mul(100)
    const ensuredBuyVolumePercentage = buyVolume.isZero() ? null : botBuyVolume.div(buyVolume).mul(100)
    const closingPriceAux = closingPrice
      .numerator
      .div(closingPrice.denominator)

    const previousClosingPriceAux = previousClosingPrice
      .numerator
      .div(previousClosingPrice.denominator)

    let priceIncrement
    if (previousClosingPrice) {
      priceIncrement = numberUtil
        .HUNDRED.mul(
          closingPriceAux.minus(previousClosingPriceAux)
        )
        .div(previousClosingPriceAux)
    } else {
      priceIncrement = null
    }

    addAuctionInfo({
      auctionIndex: auctionIndex.toNumber(),
      sellToken: sellTokenSymbol,
      buyToken: buyTokenSymbol,
      sellVolume: sellVolume.div(1e18),
      buyVolume: buyVolume.div(1e18),
      lastClosingPrice: closingPriceAux,
      priceIncrement,
      botSellVolume: botSellVolume.div(1e18),
      botBuyVolume: botBuyVolume.div(1e18),
      ensuredSellVolumePercentage,
      ensuredBuyVolumePercentage
    })
  }

  async _doSendAuctionsReportToSlack ({ id, senderInfo, fromDate, toDate }) {
    // Generate report file
    const file = await this.getAuctionsReportFile({
      fromDate,
      toDate
    })
    logger.info('[requestId=%d] Report file "%s" was generated. Sending it to slack...',
      id, file.name)

    const message = {
      channel: this._auctionsReportSlackChannel,
      text: "Check out what the bot's been doing lately",
      attachments: [
        {
          title: 'New report avaliable',
          color: 'good',
          text: "There's a new report for the last auctions of Dutch X",
          fields: [
            {
              title: 'From:',
              value: formatUtil.formatDate(fromDate),
              short: false
            }, {
              title: 'To:',
              value: formatUtil.formatDate(toDate),
              short: false
            }
          ],
          footer: senderInfo
        }
      ]
    }

    // Send file to Slack
    return this._sendFileToSlack({
      channel: this._auctionsReportSlackChannel,
      message,
      id,
      file
    })
  }

  async _sendFileToSlack ({ channel, message, id, file }) {
    const { name: fileName, content: fileContent } = file

    // Upload file to slack
    logger.info('[requestId=%d] Uploading file "%s" to Slack', id, fileName)
    const { file: fileSlack } = await this._slackClient.uploadFile({
      fileName,
      file: fileContent,
      channels: channel
    })

    const url = fileSlack.url_private
    logger.info('[requestId=%d] File uploaded. fileId=%s, url=%s',
      id, fileSlack.id, url)

    message.attachments[0].fields.push({
      title: 'File',
      value: url,
      short: false
    })

    // Send message with the file attached
    return this._slackClient
      .postMessage(message)
      .then(({ ts }) => {
        logger.info('File sent to Slack: ', ts)
      })
  }
}

function _assertDatesOverlap (fromDate, toDate) {
  assert(fromDate < toDate, "The 'toDate' must be greater than the 'fromDate'")
}

module.exports = ReportService
