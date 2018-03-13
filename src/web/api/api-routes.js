const express = require('express')
const router = express.Router()

// const debug = require('debug')('DEBUG-dx-services:web:api')

function getRouter ({ apiService }) {
  router.get([ '/', '/version' ], async (req, res) => {
    const version = await apiService.getVersion()
    res.send(version)
  })
  
  // TODO Remove
  router.get('/ping', (req, res) => {
    res.status(204).send()
  })

  router.get('/health', async (req, res) => {
    const healthEthereum = await apiService.getHealthEthereum()
    res.status(200).send({
      ethereum: healthEthereum
    })
  })

  /*
  router.get('/health/ethereum-connected', async (req, res) => {
    const isConnectedToEthereum = await apiService.isConnectedToEthereum()
    res.status(200).send(isConnectedToEthereum)
  })

  router.get('/ethereum/ethereum-syncing', async (req, res) => {
    const syncing = await apiService.getSyncing()
    res.status(200).send(syncing)
  })
  */
  
  router.get('/about', async (req, res) => {
    const about = await apiService.getAbout()
    about.test = 'Just a test!'
    res.send(about)
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
