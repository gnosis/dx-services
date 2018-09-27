// List of pending transactions
const Logger = require('./Logger')
const logger = new Logger('dx-service:helpers:sendTxWithUniqueNonce')

const pendingTransaction = []

// This time, is just to allow the transaction
// to distribute to other nodes. Its triggered after we know it's at list in one
// node (i.e. important in case of using a pool of nodes)
const TIME_TO_RELEASE_LOCK = 100 || process.env.SEND_TX_RELEASE_LOCK_MS

const NONCE_INCREMENT_CHECK_TIME = 3000

let lock = false

async function sendTxWithUniqueNonce (transactionParams) {
  if (lock) {
    logger.debug("I'll wait for later")
    pendingTransaction.push(transactionParams)
  } else {
    logger.debug("I'll do it now")
    _sendTransaction(transactionParams)
  }
}

async function _sendTransaction ({
  getNonceFn,
  from,
  sendTransaction
}) {
  lock = true
  const releaseLock = () => {
    logger.debug('Realising lock')
    setTimeout(() => {
      // Check if we have pending transactions
      if (pendingTransaction.length > 0) {
        // Handle the pending transaction: FIFO
        const transactionParams = pendingTransaction.shift()
        _sendTransaction(transactionParams)
      } else {
        // No pending transaction, we release the lock
        lock = false
      }
    }, TIME_TO_RELEASE_LOCK)
  }

  // Get the current nonce
  const nonce = await getNonceFn()
  logger.debug(`Nonce: ${nonce}`)

  // Trigger the transaction
  const txPromise = sendTransaction(nonce)

  // Wait until the transaction is in the mempool of at list a node
  // so we can release the lock
  _waitForNonceToIncrement(nonce, from, getNonceFn, releaseLock)

  return txPromise
}

function _waitForNonceToIncrement (nonce, from, getNonceFn, releaseLock) {
  const intervalId = setInterval(() => {
    getNonceFn().then(newNonce => {
      logger.debug(`Checking nonce update: ${nonce} - current nonce: ${newNonce}. Transactions in queue: ${pendingTransaction.length}`)
      // check if the transaction has been incremented
      if (newNonce === nonce + 1) {
        releaseLock()
        // The transaction is in the mempool
        clearInterval(intervalId)
      }
    })
  }, NONCE_INCREMENT_CHECK_TIME)
}

module.exports = sendTxWithUniqueNonce
