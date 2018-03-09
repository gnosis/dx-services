class Bot {
  constructor (name) {
    this.name = name
    this.startTime = null
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
