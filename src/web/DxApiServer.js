const info = require('debug')('INFO-dx-service:DxApiServer')
const express = require('express')
const http = require('http')
const cors = require('cors')


// Constants
const DEFAULT_PORT = 8080
const DEFAULT_HOST = '0.0.0.0'
const CONTEXT_PATH = ''

class DxApiServer {
  constructor ({ port = DEFAULT_PORT, host = DEFAULT_HOST, apiService }) {
    this._port = port
    this._host = host
    this._apiService = apiService
  }

  async start () {
    // App
    const app = express()
    this._app = app

    // Enable CORS
    app.use(cors())

    // Define all the routes
    const routes = require('./routes')({
      apiService: this._apiService
    })
    Object.keys(routes).forEach(path => {
      const fullPath = CONTEXT_PATH + path
      info('[app] Define path ', fullPath)
      app.use(fullPath, routes[path])
    })
    
    // Version, About (getAboutInfo)
    this._server = http.createServer(app)
    return new Promise((resolve, reject) => {
      this._server.listen(this._port, this._host, () => {
        info(`Running API Servier on http://%s:%d`, this._host, this._port)
        info(`Try http://%s:%d/ping to check the service is onLine`,
          this._host, this._port
        )
        resolve(this)
      })
    })
  }

  async stop () {
    if (this._server) {
      info('Stopping server on http://%s:%d ...', this._host, this._port)
      await this._server.close()
    }

    info('The API server has been stopped')
  }
}

module.exports = DxApiServer
