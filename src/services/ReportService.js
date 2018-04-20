const loggerNamespace = 'dx-service:services:ReportService'
const Logger = require('../helpers/Logger')
const formatUtil = require('../helpers/formatUtil')
const logger = new Logger(loggerNamespace)
const assert = require('assert')
const fs = require('fs')
const TEST_FILE = `Auction index;Sell token;Buy token;Sell volume;Buy volume;Last closing price;Price increment;Bot sell volume;Bot buy volume;Ensured sell volume;Ensured buy volume\
1;ETH;RDN;0,9;0,9;300;N/A;0.9;0.9;100,00%;100,00%
1;RDN;ETH;0;0;0,003333333;N/A;0;0;0,00%;0,00%
2;ETH;RDN;1,4;1,4;330;10,00%;0,85;0,95;60,71%;0,63%
2;RDN;ETH;150;150;0,003030303;-10,00%;120;33;80,00%;22,00%`

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
    const file = await this._getAuctionsReportFile({
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

  async _getAuctionsReportFile ({ fromDate, toDate }) {
    assert(fromDate < toDate, "The 'toDate' must be greater than the 'fromDate'")

    logger.info('Generate auction report from "%s" to "%s"',
      formatUtil.formatDateTime(fromDate),
      formatUtil.formatDateTime(toDate)
    )

    //  ReadableStream or a Buffer
    const content = Buffer.from(TEST_FILE, 'utf8')

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve({
          name: 'auctions-reports.csv',
          mimeType: 'text/csv',
          content
        })
      }, 3000)
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
    logger.info('[requestId=%d] File uploaded. fileId=%d, url=%s',
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
