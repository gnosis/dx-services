const NodeCache = require('node-cache')
const gracefullShutdown = require('./gracefullShutdown')

const DEFAULT_TIMEOUT = 60000 // 60s
const DEFAULT_CHECK_PERIOD = 3000 // 3s

const caches = []

class Cache {
  constructor (name) {
    this._name = name
    this._cache = new NodeCache({
      stdTTL: DEFAULT_TIMEOUT,
      checkperiod: DEFAULT_CHECK_PERIOD
    })
    caches.push(this._cache)
  }

  get ({ key, time, fetchFn }) {
    let value = this._cache.get(key)
    if (value === undefined || value === null) {
      value = fetchFn()
      this._cache.set(key, value, time)
    }

    return value
  }
}

function _clearAll () {
  caches.forEach(cacheInstance => {
    cacheInstance.close()
  })
}

Cache.prototype.clearAll = _clearAll

// Clear all caches
gracefullShutdown.onShutdown(() => {
  _clearAll()
})

module.exports = Cache
