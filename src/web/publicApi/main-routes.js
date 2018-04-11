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

  // accounts routes
  router.get('/accounts/:accountAddress/current-fee-ratio', async (req, res) => {
    let params = { address: req.params.accountAddress }
    let feeRatio = await dxInfoService.getCurrentFeeRatio(params)
    res.send(feeRatio)
  })

  router.get('/accounts/:accountAddress/balances/:tokenPair/seller', async (req, res) => {
    let tokenPair = _tokenPairSplit(req.params.tokenPair)
    let params = Object.assign(
      tokenPair,
      { address: req.params.accountAddress }
    )
    let sellerBalance = await dxInfoService.getSellerBalanceForCurrentAuction(params)
    res.send(sellerBalance)
  })

  router.get('/accounts/:accountAddress/balances/:tokenPair/buyer', async (req, res) => {
    let tokenPair = _tokenPairSplit(req.params.tokenPair)
    let params = Object.assign(
      tokenPair,
      { address: req.params.accountAddress }
    )
    let buyerBalance = await dxInfoService.getBuyerBalanceForCurrentAuction(params)
    res.send(buyerBalance)
  })

  // TODO implement getAccountBalanceForToken in service
  router.get('/accounts/:accountAddress/tokens/:tokenPair', async (req, res) => {
    // let tokenPair = _tokenPairSplit(req.params.tokenPair)
    // let accountBalance = await dxInfoService.getAccountBalanceForToken(tokenPair)
    // res.send(accountBalance)
  })

  return router
}

function _tokenPairSplit (tokenPair) {
  let splittedPair = tokenPair.split('-')
  return {
    sellToken: splittedPair[0].toUpperCase(),
    buyToken: splittedPair[1].toUpperCase()
  }
}

module.exports = getRouter
