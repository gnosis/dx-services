const debug = require('debug')('dx-service:DxApiServer')
const express = require('express')

// Constants
const DEFAULT_PORT = 8080
const DEFAULT_HOST = '0.0.0.0'

class DxApiServer {
  constructor ({ port = DEFAULT_PORT, host = DEFAULT_HOST }) {
    this._port = port
    this._host = host
  }

  async start () {
    // App
    const app = express()
    this._app = app

    app.get('/', (req, res) => {
      res.send('Dutch Exchange Bots - say Hi!')
    })

    app.get('/ping', (req, res) => {
      res.status(204).send()
    })

    app.listen(this._port, this._host, () => {
      debug(`Running API Servier on http://%s:%d`, this._host, this._port)
      debug(`Try http://%s:%d/ping to check the service is onLine`,
        this._host, this._port
      )
    })
  }

  async stop () {
    debug('Stopping on http://%s:%d ...', this._host, this._port)
    return this._app.close(() => {
      debug('The API Server has been stopped')
    })
  }
}

module.exports = DxApiServer
