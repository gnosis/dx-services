const loggerNamespace = 'dx-service:services:ReportService'
const Logger = require('../helpers/Logger')
const assert = require('assert')
const getBotAddress = require('../helpers/getBotAddress')
const logger = new Logger(loggerNamespace)
const formatUtil = require('../helpers/formatUtil')
const dxFilters = require('../helpers/dxFilters')
const AuctionsReportRS = require('./helpers/AuctionsReportRS')
const getTokenOrder = require('../helpers/getTokenOrder')
// const dateUtil = require('../helpers/dateUtil')
// const AUCTION_START_DATE_MARGIN_HOURS = '18' // 24h (max) - 6 (estimation)
const numberUtil = require('../helpers/numberUtil')

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

    logger.debug('Generate auction report from "%s" to "%s"',
      formatUtil.formatDateTime(fromDate),
      formatUtil.formatDateTime(toDate)
    )

    const auctionsReportRS = new AuctionsReportRS({ delimiter: '\t' })
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
    logger.debug('[requestId=%d] Generating report between "%s" and "%s" requested by "%s"...',
      id, formatUtil.formatDateTime(fromDate), formatUtil.formatDateTime(toDate),
      senderInfo
    )
    this._doSendAuctionsReportToSlack({ id, senderInfo, fromDate, toDate })
      .then(() => {
        logger.debug('The auctions report was sent to slack')
      })
      .catch(error => {
        logger.error({
          msg: '[requestId=%d] Error generating and sending the auctions report to slack: %s',
          params: [ id, error.toString() ],
          error
        })
      })

    // Return the request id and message
    logger.debug('[requestId=%d] Returning a receipt', id)
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
        logger.debug('All info was generated')
        end()
      })
      .catch(end)
  }

  async _getAuctionsEventInfo ({ fromDate, toDate, addAuctionInfo }) {
    const [ fromBlock, toBlock, botAddress ] = await Promise.all([
      this._ethereumRepo.getFirstBlockAfterDate(fromDate),
      this._ethereumRepo.getLastBlockBeforeDate(toDate),
      this._botAddressPromise
    ])
    assert(botAddress, 'The bot address was not configured. Define the MNEMONIC environment var')

    // Get auctions info
    let auctions = await this._auctionRepo
      .getAuctions({
        fromBlock, toBlock
      })

    // Remove the unknown markets
    auctions = auctions.filter(({ sellTokenSymbol, buyTokenSymbol }) => {
      return this._isKnownMarket(sellTokenSymbol, buyTokenSymbol)
    })

    // Get the start of the first of the auctions
    const startOfFirstAuction = auctions
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
        user: botAddress
      }),

      // Get the bot's buy orders
      this._auctionRepo.getBuyOrders({
        fromBlock: fromBlockStartAuctions,
        toBlock,
        user: botAddress
      })
    ])

    // Get info for every token pair
    if (auctions.length > 0) {
      const generateInfoPromises = this
        ._markets
        .map(({ tokenA, tokenB }) => {
          let tokenPairFilter = dxFilters.createTokenPairFilter({
            sellToken: tokenA,
            buyToken: tokenB,
            sellTokenParam: 'sellTokenSymbol',
            buyTokenParam: 'buyTokenSymbol'
          })

          let tokenPairFilterOpp = dxFilters.createTokenPairFilter({
            sellToken: tokenB,
            buyToken: tokenA,
            sellTokenParam: 'sellTokenSymbol',
            buyTokenParam: 'buyTokenSymbol'
          })

          const params = {
            fromDate,
            toDate,
            allBotBuyOrders: botBuyOrders,
            allBotSellOrders: botSellOrders,
            addAuctionInfo
          }
          
          // Generate report for both markets
          return Promise.all([
            // Report for tokenA-tokenB
            this._generateAuctionInfoByMarket(Object.assign(params, {
              sellToken: tokenA,
              buyToken: tokenB,
              auctions: auctions.filter(tokenPairFilter)
            })),

            // Report for tokenB-tokenA
            this._generateAuctionInfoByMarket(Object.assign(params, {
              sellToken: tokenB,
              buyToken: tokenA,
              auctions: auctions.filter(tokenPairFilterOpp)
            }))
          ])
        })
  
      return Promise.all(generateInfoPromises)
    } else {
      logger.debug("There aren't any auctions between %s and %s",
        formatUtil.formatDateTime(fromDate),
        formatUtil.formatDateTime(toDate)
      )
    }
  }

  async _generateAuctionInfoByMarket ({
    fromDate,
    toDate,
    sellToken,
    buyToken,
    auctions,
    allBotBuyOrders,
    allBotSellOrders,
    addAuctionInfo
  }) {
    if (auctions.length > 0) {
      logger.debug('Get auctions for %s-%s between %s and %s',
        sellToken,
        buyToken,
        formatUtil.formatDateTime(fromDate),
        formatUtil.formatDateTime(toDate)
      )
      const generateInfoPromises = auctions.map(auction => {
        const {
          sellToken: sellTokenAddress,
          buyToken: buyTokenAddress,
          auctionIndex
        } = auction

        logger.debug('Get information for auction %s of %s-%s',
          auctionIndex,
          sellToken,
          buyToken
        )

        const filterOrder = dxFilters.createAuctionFilter({
          sellToken: sellTokenAddress,
          buyToken: buyTokenAddress,
          auctionIndex
        })

        // Add the auction buy orders and sell orders
        const auctionInfoWithOrders = Object.assign(auction, {
          botBuyOrders: allBotBuyOrders.filter(filterOrder),
          botSellOrders: allBotSellOrders.filter(filterOrder),
          addAuctionInfo
        })

        return this._generateAuctionInfo(auctionInfoWithOrders)
      })
      return Promise.all(generateInfoPromises)
    } else {
      logger.debug('There are no auctions for %s-%s between %s and %s',
        sellToken,
        buyToken,
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
    auctionStart, // not reliable yet
    auctionEnd,
    botSellOrders,
    botBuyOrders,
    buyVolume,
    sellVolume,
    closingPrice,
    previousClosingPrice,
    addAuctionInfo
  }) {
    // logger.debug('Get info: %o', arguments[0])
    // TODO: Add auctionEnd, auctionStart, runningTime

    function sumOrdersVolumes (botSellOrders) {
      return botSellOrders
        .map(order => order.amount)
        .reduce((sum, amount) => {
          return sum.plus(amount)
        }, numberUtil.toBigNumber(0))
    }

    const botSellVolume = sumOrdersVolumes(botSellOrders)
    const botBuyVolume = sumOrdersVolumes(botBuyOrders)

    let closingPriceAux
    if (closingPrice) {
      closingPriceAux = closingPrice
        .numerator
        .div(closingPrice.denominator)
    } else {
      closingPriceAux = null
    }

    let priceIncrement
    if (closingPriceAux && previousClosingPrice) {
      const previousClosingPriceAux = previousClosingPrice
        .numerator
        .div(previousClosingPrice.denominator)

      priceIncrement = numberUtil.getIncrement({
        newValue: closingPriceAux,
        oldValue: previousClosingPriceAux
      })
    } else {
      priceIncrement = null
    }

    const ensuredSellVolumePercentage = numberUtil.getPercentage({
      part: botSellVolume,
      total: sellVolume
    })
    const ensuredBuyVolumePercentage = numberUtil.getPercentage({
      part: botBuyVolume,
      total: buyVolume
    })

    addAuctionInfo({
      // Auction info
      auctionIndex: auctionIndex.toNumber(),
      sellToken: sellTokenSymbol,
      buyToken: buyTokenSymbol,
      auctionStart, // Not reliable yet
      auctionEnd,

      // Volumes
      sellVolume: sellVolume ? sellVolume.div(1e18).toNumber() : 0,
      buyVolume: buyVolume ? buyVolume.div(1e18).toNumber() : 0,

      // Price
      closingPrice: closingPriceAux ? closingPriceAux.toNumber() : 0,
      priceIncrement: priceIncrement ? priceIncrement.toNumber() : null,

      // Bot sell/buy
      botSellVolume: botSellVolume ? botSellVolume.div(1e18).toNumber() : 0,
      botBuyVolume: botBuyVolume ? botBuyVolume.div(1e18).toNumber() : 0,
      ensuredSellVolumePercentage: ensuredSellVolumePercentage ? ensuredSellVolumePercentage.toNumber() : 0,
      ensuredBuyVolumePercentage: ensuredBuyVolumePercentage ? ensuredBuyVolumePercentage.toNumber() : 0
    })
  }

  async _doSendAuctionsReportToSlack ({ id, senderInfo, fromDate, toDate }) {
    // Generate report file
    const file = await this.getAuctionsReportFile({
      fromDate,
      toDate
    })
    logger.debug('[requestId=%d] Report file "%s" was generated. Sending it to slack...',
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
    logger.debug('[requestId=%d] Uploading file "%s" to Slack', id, fileName)
    const { file: fileSlack } = await this._slackClient.uploadFile({
      fileName,
      file: fileContent,
      channels: channel
    })

    const url = fileSlack.url_private
    logger.debug('[requestId=%d] File uploaded. fileId=%s, url=%s',
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
        logger.debug('File sent to Slack: ', ts)
      })
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

}

function _assertDatesOverlap (fromDate, toDate) {
  assert(fromDate < toDate, "The 'toDate' must be greater than the 'fromDate'")
}

module.exports = ReportService
