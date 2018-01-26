const debug = require('debug')('dx-service:DxApiServer')
const express = require('express')

// Constants
const DEFAULT_PORT = 8080
const DEFAULT_HOST = '0.0.0.0'

class DxApiServer {
  constructor ({ port = DEFAULT_PORT, host = DEFAULT_HOST, auctionService }) {
    this._port = port
    this._host = host
    this._auctionService = auctionService
  }

  async start () {
    // App
    const app = express()
    this._app = app

    app.get('/', async (req, res) => {
      const version = await this._auctionService.getVersion()
      res.send('Dutch Exchange Bots - version ' + version)
    })

    app.get('/ping', (req, res) => {
      res.status(204).send()
    })

    app.get('/version', async (req, res) => {
      res.send(await this._auctionService.getVersion())
    })

    app.get('/about', async (req, res) => {
      res.send(await this._auctionService.getAbout())
    })

    // Version, About (getAboutInfo)
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
