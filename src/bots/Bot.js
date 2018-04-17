const getVersion = require('../helpers/getVersion')
const environment = process.env.NODE_ENV

class Bot {
  constructor (name) {
    this.name = name
    this.startTime = null

    this._botInfo = name + ' - v' + getVersion()
    if (environment !== 'pro') {
      const environmentDesc = '[' + environment.toUpperCase() + '] '
      this.botInfo = environmentDesc + this._botInfo
      this.nameForLogging = environmentDesc + name
    } else {
      this.nameForLogging = name
    }
  }

  async start () {
    if (!this.startTime) {
      this.startTime = new Date()
    }
    return this._doStart()
  }

  async stop () {
    return this._doStop()
  }

  async restart () {
    return this.stop()
      .then(() => this.start())
  }
}

module.exports = Bot
