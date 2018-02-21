const debug = require('debug')('dx-service:helpers:ethereumEvents')

function watchEvents (name, filter, callback) {
  filter.get((error, logs) => {
    if (error) {
      callback(error, { name })
    } else {
      // TODO: Resolve
      logs.map(log => {
        debug('[%s:%d] New log "%s" - %o', name, log.logIndex, log.event, log.args)
        const eventDetails = Object.assign({ name }, log)
        callback(null, eventDetails)
      })
    }
  })
}

function watch ({ name, contract, callback, fromBlock = 0, events = null }) {
  debug('Watch for contract %s (%s) events: %s',
    name,
    contract.address,
    events ? events.join(', ') : 'all'
  )
  const filterObj = { fromBlock }

  if (events === null) {
    // Subscribe to all events
    watchEvents(name, contract.allEvents(filterObj), callback)
  } else {
    // Watch for a list of events
    events.forEach(event => {
      debug('Subscribe to event %s', event)
      watchEvents(name, contract[event](null, filterObj), callback)
    })
  }
}

module.exports = {
  watch
}
