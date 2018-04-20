const loggerNamespace = 'dx-service:services:helpers:AuctionsReportRS'
const Logger = require('../../helpers/Logger')
const logger = new Logger(loggerNamespace)

const HEADER = `\
Auction index;\
Sell token;\
Buy token;\
Sell volume;\
Buy volume;\
Last closing price;\
Price increment;\
Bot sell volume;\
Bot buy volume;\
Ensured sell volume;\
Ensured buy volume\n`

const { Readable } = require('stream')

class AuctionsReportRS extends Readable {
  constructor () {
    super()

    this.push(HEADER, 'UTF-8')
  }

  _read (size) {
  }

  addAuction ({
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
    const line = `\
${auctionIndex};\
${sellToken};\
${buyToken};\
${sellVolume};\
${buyVolume};\
${lastClosingPrice};\
${priceIncrement};\
${botSellVolume};\
${botBuyVolume};\
${ensuredSellVolumePercentage};\
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
