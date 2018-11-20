const getVersion = require('../helpers/getVersion')
const assert = require('assert')
const environment = process.env.NODE_ENV

class Bot {
  constructor (name, type) {
    assert(name, 'The "name" of the bot is required')
    assert(type, 'The "type" of the bot is required')
    this.name = name
    this.type = type
    this.startTime = null
    this.initialized = false

    this._botInfo = name + ' - v' + getVersion()
    if (environment !== 'pro') {
      const environmentDesc = '[' + environment.toUpperCase() + '] '
      this.botInfo = environmentDesc + this._botInfo
    }
  }

  async init () {
    this.initialized = true
    return this._doInit()
  }

  async start () {
    if (!this.startTime) {
      this.startTime = new Date()
    }
    if (!this.initialized) {
      await this.init()
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
