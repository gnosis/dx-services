const addCacheHeader = require('../helpers/addCacheHeader')

// const debug = require('debug')('DEBUG-dx-services:web:api')

function createRoutes ({ dxInfoService },
  { short: CACHE_TIMEOUT_SHORT,
    average: CACHE_TIMEOUT_AVERAGE,
    long: CACHE_TIMEOUT_LONG
  }) {
  const routes = []

  routes.push({
    path: [ '/', '/version' ],
    get (req, res) {
      return dxInfoService.getVersion()
    }
  })

  // TODO Remove
  routes.push({
    path: '/v1/ping',
    get (req, res) {
      res.status(204).send()
    }
  })

  routes.push({
    path: '/v1/health',
    get (req, res) {
      addCacheHeader({ res, time: CACHE_TIMEOUT_SHORT })
      return dxInfoService.getHealthEthereum()
    }
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

  routes.push({
    path: '/v1/tokens',
    get (req, res) {
      const count = req.query.count !== undefined ? req.query.count : 20
      addCacheHeader({ res, time: CACHE_TIMEOUT_LONG })
      return dxInfoService.getTokenList({ count })
    }
  })

  routes.push({
    path: '/about',
    get (req, res) {
      addCacheHeader({ res, time: CACHE_TIMEOUT_AVERAGE })
      return dxInfoService.getAbout()
    }
  })

  return routes
}

module.exports = createRoutes
