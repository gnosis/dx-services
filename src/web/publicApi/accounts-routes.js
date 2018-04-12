const routesHelper = require('../helpers/routesHelper')
const _tokenPairSplit = routesHelper.tokenPairSplit

function createRoutes ({ dxInfoService }) {
  const routes = []

  routes.push({
    path: '/:accountAddress/current-fee-ratio',
    get (req, res) {
      let params = { address: req.params.accountAddress }
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
      return dxInfoService.getSellerBalanceForCurrentAuction(params)
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
      return dxInfoService.getBuyerBalanceForCurrentAuction(params)
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
      return dxInfoService.getAccountBalanceForToken(params)
    }
  })

  return routes
}

module.exports = createRoutes
