// const info = require('debug')('INFO-dx-service:BotsApiServer')
const Server = require('../helpers/Server')

const express = require('express')
const path = require('path')

class BotsApiServer extends Server {
  constructor ({ port = 8081, host, botsService }) {
    super({ port, host })
    this._botsService = botsService
  }

  async _registerRoutes ({ app, contextPath }) {
    const services = {
      botsService: this._botsService
    }

    // Static content
    const mainPages = express.Router()
    mainPages.use(contextPath, express.static(path.join(__dirname, './static')))
    app.use('', mainPages)

    // Main routes
    app.use('/api', require('./main-routes')(services))
  }

  async _getServiceName () {
    const version = await this._botsService.getVersion()
    return 'Bots-API-v' + version
  }
}

module.exports = BotsApiServer
