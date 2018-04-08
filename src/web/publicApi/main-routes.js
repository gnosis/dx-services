const express = require('express')
const router = express.Router()

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

  router.get('/markets', async (req, res) => {
    res.send(await dxInfoService.getMarkets())
  })

  router.get('/markets/:tokenPair/state', async (req, res) => {
    let tokenPair = _tokenPairSplit(req.params.tokenPair)
    let state = await dxInfoService.getState(tokenPair)
    res.send(state)
  })

  router.get('/markets/:tokenPair/price', async (req, res) => {
    let tokenPair = _tokenPairSplit(req.params.tokenPair)
    let currentPairPrice = await dxInfoService.getCurrentPrice(tokenPair)
    res.send(currentPairPrice.toString())
  })

  router.get('/markets/:tokenPair/closing-prices', async (req, res) => {
    let tokenPair = _tokenPairSplit(req.params.tokenPair)
    res.send(await dxInfoService.getLastClosingPrices(tokenPair))
  })

  router.get('/markets/:tokenPair/closing-prices/:auctionIndex', async (req, res) => {
    let tokenPair = _tokenPairSplit(req.params.tokenPair)
    let params = Object.assign(
      tokenPair,
      { auctionIndex: req.params.auctionIndex }
    )
    res.send(await dxInfoService.getClosingPrice(params))
  })

  router.get('/markets/:tokenPair/current-index', async (req, res) => {
    let tokenPair = _tokenPairSplit(req.params.tokenPair)
    let auctionIndex = await dxInfoService.getAuctionIndex(tokenPair)
    res.send(auctionIndex.toString())
  })

  router.get('/markets/:tokenPair/auction-start', async (req, res) => {
    let tokenPair = _tokenPairSplit(req.params.tokenPair)
    let auctionStart = await dxInfoService.getAuctionStart(tokenPair)
    res.send(auctionStart)
  })

  router.get('/markets/:tokenPair/is-approved-market', async (req, res) => {
    let tokenPair = _tokenPairSplit(req.params.tokenPair)
    let isApprovedMarket = await dxInfoService.isApprovedMarket(tokenPair)
    res.send(isApprovedMarket)
  })

  // TODO implement method on service
  router.get('/markets/:tokenPair/extra-tokens', async (req, res) => {
    // let tokenPair = _tokenPairSplit(req.params.tokenPair)
    // let extraTokens = await dxInfoService.hasExtraTokens(tokenPair)
    // res.send(extraTokens)
  })

  router.get('/markets/:tokenPair/sell-volume', async (req, res) => {
    let tokenPair = _tokenPairSplit(req.params.tokenPair)
    let sellVolume = await dxInfoService.getSellVolume(tokenPair)
    res.send(sellVolume)
  })

  router.get('/markets/:tokenPair/sell-volume-next', async (req, res) => {
    let tokenPair = _tokenPairSplit(req.params.tokenPair)
    let sellVolumeNext = await dxInfoService.getSellVolumeNext(tokenPair)
    res.send(sellVolumeNext)
  })

  router.get('/markets/:tokenPair/buy-volume', async (req, res) => {
    let tokenPair = _tokenPairSplit(req.params.tokenPair)
    let buyVolume = await dxInfoService.getBuyVolume(tokenPair)
    res.send(buyVolume)
  })

  // accounts routes
  // TODO implement getCurrentFeeRatio in service
  router.get('/accounts/:accountAddress/current-fee-ratio', async (req, res) => {
    // let feeRatio = await dxInfoService.getCurrentFeeRatio(req.params.accountAddress)
    // res.send(feeRatio)
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
