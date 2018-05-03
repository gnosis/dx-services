const loggerNamespace = 'dx-service:services:helpers:AuctionsReportRS'
const Logger = require('../../helpers/Logger')
const formatUtil = require('../../helpers/formatUtil')
const logger = new Logger(loggerNamespace)

const DEFAULT_DELIMITER = ';'
const { Readable } = require('stream')

class AuctionsReportRS extends Readable {
  constructor ({ delimiter = DEFAULT_DELIMITER } = {}) {
    super()
    this._delimiter = delimiter
    const header = this._getHeader()
    this.push(header, 'UTF-8')
  }

  _read (size) {
  }

  _getHeader () {
    var dm = this._delimiter
    return `\
Auction cleared${dm}\
Auction index${dm}\
Sell token${dm}\
Buy token${dm}\
Sell volume${dm}\
Buy volume${dm}\
Last closing price${dm}\
Price increment${dm}\
Bot sell volume${dm}\
Bot buy volume${dm}\
Ensured sell volume${dm}\
Ensured buy volume\n`
  }

  addAuction ({
    auctionEnd,
    auctionIndex,
    sellToken,
    buyToken,
    sellVolume,
    buyVolume,
    lastClosingPrice,
    priceIncrement,
    botSellVolume,
    botBuyVolume,
    ensuredSellVolumePercentage,
    ensuredBuyVolumePercentage
  }) {
    var dm = this._delimiter
    const line = `\
${formatUtil.formatDateTime(auctionEnd)}${dm}\
${auctionIndex}${dm}\
${sellToken}${dm}\
${buyToken}${dm}\
${sellVolume}${dm}\
${buyVolume}${dm}\
${lastClosingPrice}${dm}\
${priceIncrement}${dm}\
${botSellVolume}${dm}\
${botBuyVolume}${dm}\
${ensuredSellVolumePercentage}${dm}\
${ensuredBuyVolumePercentage}\n`

    this.push(line, 'UTF-8')
  }

  end (error) {
    if (error) {
      // Throw error
      logger.error({
        msg: 'Error ' + error.message,
        error
      })
      this.emit('error', error)
    } else {
      // End the stream
      this.push(null)
    }
  }
}

module.exports = AuctionsReportRS
