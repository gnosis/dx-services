function createRoutes ({ dxInfoService }) {
  const routes = []

  routes.push({
    path: '/token-pairs',
    get (req, res) {
      const count = req.query.count !== undefined ? req.query.count : 10
      return dxInfoService.getMarkets({ count })
    }
  })

  routes.push({
    path: '/tokens',
    get (req, res) {
      const count = req.query.count !== undefined ? req.query.count : 20
      return dxInfoService.getTokenList({ count })
    }
  })

  return routes
}

module.exports = createRoutes
