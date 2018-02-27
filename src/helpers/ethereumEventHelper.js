const debug = require('debug')('dx-service:helpers:ethereumEventHelper')
const assert = require('assert')

function filter (args) {
  // TODO: Notify the events in order?
  return _filterWatchAux(args, 'get')
}

function watch (args) {
  return _filterWatchAux(args, 'watch')
}

function _filterWatchAux ({
  name,
  contract,
  callback,
  filters = null,
  fromBlock = 0,
  toBlock = 'latest',
  events = null,
}, watchMethod) {
  debug('%s for contract %s (%s) events: %s',
    watchMethod,
    name,
    contract.address,
    events ? events.join(', ') : 'all'
  )
  const aditionalFilters = { fromBlock, toBlock }

  let stopWatching
  if (events === null) {
    // Subscribe to all events
    assert.equal(filters, null, 'When filtering all the events, the parameter "filter" is allowed')
    const eventObject = contract.allEvents(aditionalFilters)
    _getAndNotifyEvents(name, eventObject, callback, watchMethod)

    // Allow to stop watching
    stopWatching = () => {
      debug('Stop listening all events')
      eventObject.stopWatching()
    }
  } else {
    // Watch for a list of events
    const stopWatchingFunctions = []
    events.forEach(event => {
      debug('Subscribe to event %s', event)
      const eventObject = contract[event](filters, aditionalFilters)
      _getAndNotifyEvents(name, eventObject, callback, watchMethod)
    })

    // Allow to stop watching
    stopWatching = () => {
      // Stop listening all events
      debug('Stop listening all events')
      stopWatchingFunctions.forEach(stopWatchingAux => stopWatchingAux())
    }
  }

  return {
    stopWatching
  }
}

function _notifyEvent (name, log, callback) {
  debug('[%s:%d] New log "%s" - %o', name, log.logIndex, log.event, log.args)
  const eventDetails = Object.assign({ name }, log)
  callback(null, eventDetails)
}

function _getAndNotifyEvents (name, eventObject, callback, watchMethod) {
  eventObject[watchMethod]((error, log) => {
    if (error) {
      callback(error, { name })
    } else {
      // console.log(log)
      if (Array.isArray(log)) {
        // Notify events
        log.map(logAux => {
          _notifyEvent(name, logAux, callback)
        })
      } else {
        // Notify event
        _notifyEvent(name, log, callback)
      }
    }
  })
}

/*
function watch ({ name, contract, callback, fromBlock = 0, events = null }) {
}
*/

/*
exampleEvent.watch(function(err, result) {
  if (err) {
    console.log(err)
    return;
  }
  console.log(result.args._value)
  // check that result.args._from is web3.eth.coinbase then
  // display result.args._value in the UI and call    
  // exampleEvent.stopWatching()
})
*/

module.exports = {
  filter,
  watch
}
