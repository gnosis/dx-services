const express = require('express')
const router = express.Router()

// const debug = require('debug')('DEBUG-dx-services:web:api')

function getRouter ({ dxInfoService }) {
  router.get([ '/', '/version' ], async (req, res) => {
    const version = await dxInfoService.getVersion()
    res.send(version)
  })
  
  // TODO Remove
  router.get('/ping', (req, res) => {
    res.status(204).send()
  })

  router.get('/health', async (req, res) => {
    const healthEthereum = await dxInfoService.getHealthEthereum()
    res.status(200).send({
      ethereum: healthEthereum
    })
  })

  /*
  router.get('/health/ethereum-connected', async (req, res) => {
    const isConnectedToEthereum = await dxInfoService.isConnectedToEthereum()
    res.status(200).send(isConnectedToEthereum)
  })

  router.get('/ethereum/ethereum-syncing', async (req, res) => {
    const syncing = await dxInfoService.getSyncing()
    res.status(200).send(syncing)
  })
  */
  
  router.get('/about', async (req, res) => {
    res.send(await dxInfoService.getAbout())
  })
  
  router.get('/markets', async (req, res) => {
    res.send(await dxInfoService.getMarkets())
  })
  
  router.get('/auctions/:currencyA/:currencyB/current', async (req, res) => {
    res.send(await dxInfoService.getAuctions({
      currencyA: req.params.currencyA,
      currencyB: req.params.currencyB
    }))
  })
  
  router.get('/auctions/:sellToken/:buyToken/current-price', async (req, res) => {
    res.send(await dxInfoService.getCurrentPrice({
      currencyA: req.params.currencyA,
      currencyB: req.params.currencyB
    }))
  })
  
  router.get('/balances/:address', async (req, res) => {
    res.send(await dxInfoService.getBalances({address: req.params.address}))
  })

  return router
}

module.exports = getRouter
