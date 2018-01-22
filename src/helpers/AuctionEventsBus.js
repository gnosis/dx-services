const Promise = require('../helpers/Promise')
const debug = require('debug')('dx-service:helpers:AuctionEventsBus')

class AuctionEventsBus {
  construcor () {
    this._listenersByEvent = {}
  }

  listenAuctionEvent (eventName, tokenA, tokenB, callback) {
    debug('Listen to %s on market %s-%s', eventName, tokenA, tokenB)
    const eventKey = this._getEventKey(eventName, tokenA, tokenB)
    let listeners = this._listenersByEvent[eventKey]

    if (!listeners) {
      // If it's the first listener
      listeners = []
      this._listenersByEvent[eventKey] = listeners
    }

    listeners.push(callback)
  }

  triggerAuctionEvent (eventName, tokenA, tokenB, data) {
    debug(
      'Trigger %s event on market %s-%s. Data = %o',
      eventName, tokenA, tokenB, data
    )
    const eventKey = this._getEventKey(eventName, tokenA, tokenB)
    let listeners = this._listenersByEvent[eventKey]

    let resultPromise
    if (listeners && listeners.length > 0) {
      // Notify all the listeners
      resultPromise = Promise.all(
        listeners.map(listener => this._notifyListener(listener, data))
      )
    } else {
      resultPromise = Promise.resolve()
    }

    return resultPromise
  }

  _getEventKey (eventName, tokenA, tokenB) {
    return `${eventName}:${tokenA}:${tokenB}`
  }

  _notifyListener (listener, data) {
    return new Promise((resolve, reject) => {
      listener(data)
      resolve()
    })
  }
}

module.exports = AuctionEventsBus
