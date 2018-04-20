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
  constructor ({ auctionRepo, ethereumRepo, markets, slackClient, auctionsReportSlackChannel }) {
    this._auctionRepo = auctionRepo
    this._ethereumRepo = ethereumRepo
    this._markets = markets
    this._slackClient = slackClient
    this._auctionsReportSlackChannel = auctionsReportSlackChannel
  }

  async getAuctionsReportInfo () {
    return new Promise((resolve, reject) => {
      const auctions = []
      this._getAuctionsReportInfo({
        addAuctionInfo (auctionInfo) {
          // logger.debug('Add auction info: ', auctionInfo)
          auctions.push(auctionInfo)
        },
        end (error) {
          if (error) {
            reject(error)
          } else {
            resolve(auctions)
          }
        }
      })
    })
  }

  _getAuctionsReportInfo ({ addAuctionInfo, end }) {
    try {
      addAuctionInfo({
        auctionIndex: 1,
        sellToken: 'ETH',
        buyToken: 'RDN',
        sellVolume: 0.9,
        buyVolume: 0.9,
        lastClosingPrice: 300,
        priceIncrement: 'N/A',
        botSellVolume: 0.9,
        botBuyVolume: 0.9,
        ensuredSellVolumePercentage: 100,
        ensuredBuyVolumePercentage: 100
      })

      addAuctionInfo({
        auctionIndex: 1,
        sellToken: 'ETH',
        buyToken: 'RDN',
        sellVolume: 0.9,
        buyVolume: 0.9,
        lastClosingPrice: 300,
        priceIncrement: 'N/A',
        botSellVolume: 0.9,
        botBuyVolume: 0.9,
        ensuredSellVolumePercentage: 100,
        ensuredBuyVolumePercentage: 100
      })
    } catch (error) {
      end(error)
    }
  }

  sendAuctionsReportToSlack ({ fromDate, toDate, senderInfo }) {
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

  async getAuctionsReportFile ({ fromDate, toDate }) {
    assert(fromDate < toDate, "The 'toDate' must be greater than the 'fromDate'")

    logger.info('Generate auction report from "%s" to "%s"',
      formatUtil.formatDateTime(fromDate),
      formatUtil.formatDateTime(toDate)
    )

    const auctionsReportRS = new AuctionsReportRS()
    this._getAuctionsReportInfo({
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

module.exports = ReportService
