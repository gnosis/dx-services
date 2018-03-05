const express = require('express')
const router = express.Router()

// const debug = require('debug')('dx-services:web:main')

function getRouter ({ apiService }) {
  router.get([ '/', '/version' ], async (req, res) => {
    const version = await apiService.getVersion()
    res.send(version)
  })
  
  router.get('/ping', (req, res) => {
    res.status(204).send()
  })
  
  router.get('/about', async (req, res) => {
    res.send(await apiService.getAbout())
  })
  
  router.get('/markets', async (req, res) => {
    res.send(await apiService.getMarkets())
  })
  
  router.get('/auctions/:currencyA/:currencyB/current', async (req, res) => {
    res.send(await apiService.getAuctions({
      currencyA: req.params.currencyA,
      currencyB: req.params.currencyB
    }))
  })
  
  router.get('/auctions/:sellToken/:buyToken/current-price', async (req, res) => {
    res.send(await apiService.getCurrentPrice({
      currencyA: req.params.currencyA,
      currencyB: req.params.currencyB
    }))
  })
  
  router.get('/balances/:address', async (req, res) => {
    res.send(await apiService.getBalances({address: req.params.address}))
  })

  return router
}

module.exports = getRouter
