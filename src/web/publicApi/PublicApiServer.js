const express = require('express')
const path = require('path')
const REST_METHODS = ['get', 'post', 'put', 'delete']

// const info = require('debug')('INFO-dx-service:PublicApiServer')
const Server = require('../helpers/Server')
const requestHandlerWrapper = require('../helpers/requestHandlerWrapper')


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
    app.use('/api/test', _createRouter(testRoutes))
  }
  async _getServiceName () {
    const version = await this._dxInfoService.getVersion()
    return 'DutchX-API-v' + version
  }
}

function _createRouter (routes) {
  const router = express.Router()

  routes.forEach(route => {
    const routesDefinitions = REST_METHODS
      .map(restMethod => ({
        restMethod,
        handler: route[restMethod]
      }))
      .filter(routeDefinition => routeDefinition.handler !== undefined)
      .map(routeDefinition => ({
        restMethod: routeDefinition.restMethod,
        handler: requestHandlerWrapper(routeDefinition.handler)
      }))

    const routerRoute = router.route(route.path)
    routesDefinitions.forEach(routeDefinition => {
      routerRoute[routeDefinition.restMethod](routeDefinition.handler)
    })
  })

  return router
}

module.exports = PublicApiServer
