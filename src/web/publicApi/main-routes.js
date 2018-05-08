const express = require('express')
const router = express.Router()

const SUCCESS_OBJ_FOR_TEST = {
  name: 'Foo',
  age: 12,
  address: {
    city: 'Baz',
    zip: 12345,
    address: 'Foo baz 1234'
  },
  validated: true
}

// const debug = require('debug')('DEBUG-dx-services:web:api')

function getRouter ({ dxInfoService, dxTradeService }) {
  router.get([ '/', '/version' ], async (req, res) => {
    const version = await dxInfoService.getVersion()
    res.send(version)
  })

  // TODO Remove
  router.get('/v1/ping', (req, res) => {
    res.status(204).send()
  })

  router.get('/v1/health', async (req, res) => {
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

  router.get('/v1/tokens', async (req, res) => {
    const count = req.query.count !== undefined ? req.query.count : 20
    res.send(await dxInfoService.getTokenList({ count }))
  })

  router.get('/about', async (req, res) => {
    res.send(await dxInfoService.getAbout())
  })

  return router
}

module.exports = getRouter
