const Debug = require('debug')

class Logger {
  constructor (namespace) {
    this._namespace = namespace
    this.loggers = []
  }

  _getLogger (prefix, sufix) {
    const loggerName =
      (prefix ? prefix + '-' : '') +
      this._namespace +
      (sufix ? '-' + sufix : '')

    let logger = this.loggers[loggerName]
    if (!logger) {
      logger = Debug(loggerName)
      this.loggers[loggerName] = logger
    }

    return logger
  }

  log (prefix, sufix, msg, ...params) {
    this._getLogger(prefix, sufix)(msg, ...params)
  }

  info (msg, ...params) {
    this._getLogger('INFO', null)(msg, ...params)
  }

  debug (msg, ...params) {
    this._getLogger('DEBUG', null)(msg, ...params)
  }

  warn (msg, ...params) {
    this._getLogger('WARN', null)(msg, ...params)
  }

  error (msg, ...params) {
    this._getLogger('ERROR', null)(msg, ...params)
  }
}

module.exports = Logger
