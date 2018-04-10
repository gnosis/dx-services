const express = require('express')
const path = require('path')

// const info = require('debug')('INFO-dx-service:PublicApiServer')
const Server = require('../helpers/Server')
const createRouter = require('../helpers/createRouter')

class PublicApiServer extends Server {
  constructor ({ port = 8080, host, dxInfoService, dxTradeService }) {
    super({ port, host })
    this._dxInfoService = dxInfoService
    this._dxTradeService = dxTradeService
  }

  async _registerRoutes ({ app, contextPath }) {
    const services = {
      dxInfoService: this._dxInfoService,
      dxTradeService: this._dxTradeService
    }

    // Get routes
    const testRoutes = require('./test-routes')(services)

    // Static content
    const mainPages = express.Router()
    mainPages.use(contextPath, express.static(path.join(__dirname, './static')))
    app.use('', mainPages)

    // Main routes
    // TODO delete after DevOps update liveness check
    app.use('/api', require('./main-routes')(services))

    // Main routes
    app.use('/api/v1', require('./main-routes')(services))
    app.use('/api/test', createRouter(testRoutes))
  }
  async _getServiceName () {
    const version = await this._dxInfoService.getVersion()
    return 'DutchX-API-v' + version
  }
}

module.exports = PublicApiServer
