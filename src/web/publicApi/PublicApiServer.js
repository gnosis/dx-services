const express = require('express')
const path = require('path')

// const info = require('debug')('INFO-dx-service:PublicApiServer')
const Server = require('../helpers/Server')
const createRouter = require('../helpers/createRouter')

class PublicApiServer extends Server {
  constructor ({ port = 8080, host, dxInfoService, dxTradeService, reportService, cacheTimeouts }) {
    super({ port, host })
    this._dxInfoService = dxInfoService
    this._dxTradeService = dxTradeService
    // FIXME delete report service once getAuctionsInfo is implemented outside this service
    this._reportService = reportService
    this._cacheTimeouts = cacheTimeouts
  }

  async _registerRoutes ({ app, contextPath }) {
    const services = {
      dxInfoService: this._dxInfoService,
      dxTradeService: this._dxTradeService,
      reportService: this._reportService
    }

    // Get routes
    const mainRoutes = require('./main-routes')(services, this._cacheTimeouts)
    const testRoutes = require('./test-routes')(services)
    const marketsRoutes = require('./markets-routes')(services, this._cacheTimeouts)
    const auctionsRoutes = require('./auctions-routes')(services, this._cacheTimeouts)
    const accountsRoutes = require('./accounts-routes')(services, this._cacheTimeouts)
    const uiRoutes = require('./ui-routes')(services, this._cacheTimeouts)

    // Static content
    const landingPage = express.Router()
    landingPage.use(contextPath, express.static(path.join(__dirname, './static/landing')))
    app.use('/', landingPage)

    const mainPages = express.Router()
    mainPages.use(contextPath, express.static(path.join(__dirname, './static')))
    app.use('/api', mainPages)

    // Main routes
    app.use('/api', createRouter(mainRoutes))
    app.use('/api/test', createRouter(testRoutes))

    // Markets routes
    app.use('/api/v1/markets', createRouter(marketsRoutes))
    // Auctions routes
    app.use('/api/v1/auctions', createRouter(auctionsRoutes))
    // Accounts routes
    app.use('/api/v1/accounts', createRouter(accountsRoutes))
    // UI routes
    app.use('/api/v1/ui', createRouter(uiRoutes))
    app.use(contextPath + '/api', express.static(path.join(__dirname, './static')))
  }
  async _getServiceName () {
    const version = await this._dxInfoService.getVersion()
    return 'DutchX-API-v' + version
  }
}

module.exports = PublicApiServer
