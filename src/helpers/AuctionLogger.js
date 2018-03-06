const Logger = require('./Logger')

class AuctionLogger extends Logger {
  debug (sellToken, buyToken, msg, ...params) {
    super.log('DEBUG', sellToken + '-' + buyToken, msg, ...params)
  }

  info (sellToken, buyToken, msg, ...params) {
    super.log('INFO', sellToken + '-' + buyToken, msg, ...params)
  }

  warn (sellToken, buyToken, msg, ...params) {
    super.log('WARN', sellToken + '-' + buyToken, msg, ...params)
  }

  error (sellToken, buyToken, msg, ...params) {
    super.log('ERROR', sellToken + '-' + buyToken, msg, ...params)
  }
}

module.exports = AuctionLogger
