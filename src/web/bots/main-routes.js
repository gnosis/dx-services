const express = require('express')
const router = express.Router()

// const debug = require('debug')('DEBUG-dx-services:web:api')

function getRouter ({ botsService }) {
  router.get([ '/', '/version' ], async (req, res) => {
    const version = await botsService.getVersion()
    res.send(version)
  })

  router.get('/ping', (req, res) => {
    res.status(204).send()
  })

  router.get('/health', async (req, res) => {
    const healthEthereum = await botsService.getHealthEthereum()
    res.status(200).send({
      ethereum: healthEthereum
    })
  })

  router.get('/about', async (req, res) => {
    const dxAbout = await botsService.getAbout()
    const botsAbout = await botsService.getAbout()
    res.send(Object.assign({}, dxAbout, botsAbout))
  })

  return router
}

module.exports = getRouter
