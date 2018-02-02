const debug = require('debug')('dx-service:DxApiServer')
const express = require('express')
const http = require('http')

// Constants
const DEFAULT_PORT = 8080
const DEFAULT_HOST = '0.0.0.0'

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

    app.get('/', async (req, res) => {
      const version = await this._apiService.getVersion()
      res.send('Dutch Exchange Bots - version ' + version)
    })

    app.get('/ping', (req, res) => {
      res.status(204).send()
    })

    app.get('/version', async (req, res) => {
      res.send(await this._apiService.getVersion())
    })

    app.get('/about', async (req, res) => {
      res.send(await this._apiService.getAbout())
    })

    app.get('/auctions/:currencyA/:currencyB/current', async (req, res) => {
      res.send(await this._apiService.getAuctions({
        currencyA: req.params.currencyA,
        currencyB: req.params.currencyB
      }))
    })

    app.get('/auctions/:sellToken/:buyToken/current-price', async (req, res) => {
      res.send(await this._apiService.getCurrentPrice({
        currencyA: req.params.currencyA,
        currencyB: req.params.currencyB
      }))
    })

    app.get('/balances/:address', async (req, res) => {
      res.send(await this._apiService.getBalances({address: req.params.address}))
    })

    // Version, About (getAboutInfo)
    this._server = http.createServer(app)
    return new Promise((resolve, reject) => {
      this._server.listen(this._port, this._host, () => {
        debug(`Running API Servier on http://%s:%d`, this._host, this._port)
        debug(`Try http://%s:%d/ping to check the service is onLine`,
          this._host, this._port
        )
        resolve(this)
      })
    })
  }

  async stop () {
    if (this._server) {
      debug('Stopping server on http://%s:%d ...', this._host, this._port)
      await this._server.close()
    }

    debug('The API server has been stopped')
  }
}

module.exports = DxApiServer
