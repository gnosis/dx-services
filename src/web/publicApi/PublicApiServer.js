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
    const marketsRoutes = require('./markets-routes')(services)
    const accountsRoutes = require('./accounts-routes')(services)
    const uiRoutes = require('./ui-routes')(services)

    // Static content
    const mainPages = express.Router()
    mainPages.use(contextPath, express.static(path.join(__dirname, './static')))
    app.use('', mainPages)

    // Main routes
    app.use('/api/v1', require('./main-routes')(services))
    app.use('/api/test', createRouter(testRoutes))

    // Markets routes
    app.use('/api/v1/markets', createRouter(marketsRoutes))
    // Accounts routes
    app.use('/api/v1/accounts', createRouter(accountsRoutes))
    // UI routes
    app.use('/api/v1/ui', createRouter(uiRoutes))
  }
  async _getServiceName () {
    const version = await this._dxInfoService.getVersion()
    return 'DutchX-API-v' + version
  }
}

module.exports = PublicApiServer
