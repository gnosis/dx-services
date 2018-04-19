// const info = require('debug')('INFO-dx-service:BotsApiServer')
const Server = require('../helpers/Server')
const createRouter = require('../helpers/createRouter')
const formatUtil = require('../../helpers/formatUtil')

const express = require('express')
const path = require('path')

class BotsApiServer extends Server {
  constructor ({ port = 8081, host, botsService, reportService }) {
    super({ port, host })
    this._botsService = botsService
    this._reportService = reportService
  }

  async _registerRoutes ({ app, contextPath }) {
    const services = {
      botsService: this._botsService,
      reportService: this._reportService
    }

    // Static content
    const mainPages = express.Router()
    mainPages.use(contextPath, express.static(path.join(__dirname, './static')))
    app.use('', mainPages)

    // Get routes
    const reportsRoutes = require('./reports-routes')(services)

    // Main routes
    // TODO delete after DevOps update liveness check
    app.use('/api', require('./main-routes')(services))

    app.use('/api/v1/reports', createRouter(reportsRoutes))

    // Main routes
    app.use('/api/v1', require('./main-routes')(services))
  }

  async _getServiceName () {
    const version = await this._botsService.getVersion()
    return 'Bots-API-v' + version
  }
}

module.exports = BotsApiServer
