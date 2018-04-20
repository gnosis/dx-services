const loggerNamespace = 'dx-service:services:ReportService'
const Logger = require('../helpers/Logger')
const logger = new Logger(loggerNamespace)
const formatUtil = require('../helpers/formatUtil')
const AuctionsReportRS = require('./helpers/AuctionsReportRS')
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

    auctionsReportRS.end()

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

  async _generateAuctionInfo ({ auctionIndex, tokenA, tokenB, addAuctionInfo }) {

  }

  async _generateAuctionInfoByMarket ({ fromDate, toDate, tokenA, tokenB, addAuctionInfo }) {
    logger.info('Get auctions for %s-%s between %s and %s',
      tokenA,
      tokenB,
      formatUtil.formatDate(fromDate),
      formatUtil.formatDate(toDate)
    )

    const [ startAuctionIndex, endAuctionIndex ] = await Promise.all([
      this._auctionRepo.getFirstAuctionIndexAfterDate({
        tokenA,
        tokenB,
        date: fromDate
      }),
      this._auctionRepo.getFirstAuctionIndexAfterDate({
        tokenA,
        tokenB,
        date: toDate
      })
    ])

    addAuctionInfo({
      auctionIndex: 1,
      sellToken: tokenA,
      buyToken: tokenB,
      sellVolume: 0.9,
      buyVolume: 0.9,
      lastClosingPrice: 300,
      priceIncrement: 'N/A',
      botSellVolume: 0.9,
      botBuyVolume: 0.9,
      ensuredSellVolumePercentage: 100,
      ensuredBuyVolumePercentage: 100
    })

    if (startAuctionIndex && endAuctionIndex) {
      for (let auctionIndex = startAuctionIndex; auctionIndex <= endAuctionIndex; auctionIndex++) {
        logger.info('Get information for auction %s of %s-%s',
          auctionIndex,
          tokenA,
          tokenB
        )
      }
    } else {
      logger.info('There are no auctions for %s-%s between %s and %s',
        tokenA,
        tokenB,
        formatUtil.formatDate(fromDate),
        formatUtil.formatDate(toDate)
      )
    }
  }

  _generateAuctionInfoByDates ({ fromDate, toDate, addAuctionInfo, end }) {
    // Get info for every token pair
    const generateInfoPromises = this
      ._markets
      .map(({ tokenA, tokenB }) => {
        return this._generateAuctionInfoByMarket({
          fromDate,
          toDate,
          tokenA,
          tokenB,
          addAuctionInfo
        })
      })

    Promise
      .all(generateInfoPromises)
      .then(() => {
        logger.info('All info was generated')
        end()
      })
      .catch(end)
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
        console.log('Message sent: ', ts)
      })
  }
}

function _assertDatesOverlap (fromDate, toDate) {
  assert(fromDate < toDate, "The 'toDate' must be greater than the 'fromDate'")
}

module.exports = ReportService
