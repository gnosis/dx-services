function createRoutes ({ dxInfoService }) {
  const routes = []

  routes.push({
    path: '/token-pairs',
    get (req, res) {
      return dxInfoService.getMarkets()
    }
  })

  routes.push({
    path: '/tokens',
    get (req, res) {
      return dxInfoService.getTokenList()
    }
  })

  return routes
}

module.exports = createRoutes
