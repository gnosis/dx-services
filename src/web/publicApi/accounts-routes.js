const formatUtil = require('../../helpers/formatUtil')
const _tokenPairSplit = formatUtil.tokenPairSplit

const addCacheHeader = require('../helpers/addCacheHeader')

function createRoutes ({ dxInfoService },
  { short: CACHE_TIMEOUT_SHORT,
    average: CACHE_TIMEOUT_AVERAGE,
    long: CACHE_TIMEOUT_LONG
  }) {
  const routes = []

  routes.push({
    path: '/:accountAddress/current-fee-ratio',
    get (req, res) {
      let params = { address: req.params.accountAddress }
      addCacheHeader({ res, time: CACHE_TIMEOUT_AVERAGE })
      return dxInfoService.getCurrentFeeRatio(params)
    }
  })

  routes.push({
    path: '/:accountAddress/balances/:tokenPair/seller',
    get (req, res) {
      let tokenPair = _tokenPairSplit(req.params.tokenPair)
      let params = Object.assign(
        tokenPair,
        { address: req.params.accountAddress }
      )
      addCacheHeader({ res, time: CACHE_TIMEOUT_AVERAGE })
      return dxInfoService.getSellerBalanceForCurrentAuction(params)
    }
  })

  routes.push({
    path: '/:accountAddress/balances/:tokenPair/auctions/:auctionIndex/seller',
    get (req, res) {
      let tokenPair = _tokenPairSplit(req.params.tokenPair)
      let params = Object.assign(
        tokenPair,
        { address: req.params.accountAddress,
          auctionIndex: req.params.auctionIndex }
      )
      addCacheHeader({ res, time: CACHE_TIMEOUT_AVERAGE })
      return dxInfoService.getSellerBalance(params)
    }
  })

  routes.push({
    path: '/:accountAddress/balances/:tokenPair/buyer',
    get (req, res) {
      let tokenPair = _tokenPairSplit(req.params.tokenPair)
      let params = Object.assign(
        tokenPair,
        { address: req.params.accountAddress }
      )
      addCacheHeader({ res, time: CACHE_TIMEOUT_SHORT })
      return dxInfoService.getBuyerBalanceForCurrentAuction(params)
    }
  })

  routes.push({
    path: '/:accountAddress/balances/:tokenPair/auctions/:auctionIndex/buyer',
    get (req, res) {
      let tokenPair = _tokenPairSplit(req.params.tokenPair)
      let params = Object.assign(
        tokenPair,
        { address: req.params.accountAddress,
          auctionIndex: req.params.auctionIndex }
      )
      addCacheHeader({ res, time: CACHE_TIMEOUT_SHORT })
      return dxInfoService.getBuyerBalance(params)
    }
  })

  routes.push({
    path: '/:accountAddress/tokens/:tokenSymbol',
    get (req, res) {
      let token = req.params.tokenSymbol.toUpperCase()
      let params = Object.assign({
        token,
        address: req.params.accountAddress
      })
      addCacheHeader({ res, time: CACHE_TIMEOUT_SHORT })
      return dxInfoService.getAccountBalanceForToken(params)
    }
  })

  return routes
}

module.exports = createRoutes
