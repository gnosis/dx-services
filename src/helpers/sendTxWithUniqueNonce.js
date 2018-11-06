// List of pending transactions
const Logger = require('./Logger')
const logger = new Logger('dx-service:helpers:sendTxWithUniqueNonce')
const environment = process.env.NODE_ENV
const isLocal = environment === 'local'

const pendingTransaction = []

// This time, is just to allow the transaction
// to distribute to other nodes. Its triggered after we know it's at list in one
// node (i.e. important in case of using a pool of nodes)
const TIME_TO_RELEASE_LOCK = isLocal ? 0 : (100 || process.env.SEND_TX_RELEASE_LOCK_MS)

const NONCE_INCREMENT_CHECK_TIME = 3000

let accountsLocks = {}

async function sendTxWithUniqueNonce (transactionParams) {
  const { from } = transactionParams
  if (accountsLocks[from]) {
    logger.debug("The account %s is locked. I'll wait for later", from)
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
  accountsLocks[from] = true
  const releaseLock = () => {
    logger.info('Releasing lock for %s...', from)
    setTimeout(() => {
      // Check if we have pending transactions
      if (pendingTransaction.length > 0) {
        // Handle the pending transaction: FIFO
        const transactionParams = pendingTransaction.shift()
        _sendTransaction(transactionParams)
      } else {
        // No pending transaction, we release the lock
        logger.info('Lock released for %s', from)
        accountsLocks[from] = false
      }
    }, TIME_TO_RELEASE_LOCK)
  }

  // Get the current nonce
  const nonce = await getNonceFn(from)
  logger.info(`Nonce for %s: %s`, from, nonce)

  // Trigger the transaction
  const txPromise = sendTransaction(nonce)

  // Wait until the transaction is in the mempool of at list a node
  // so we can release the lock
  _waitForNonceToIncrement(nonce, from, getNonceFn, releaseLock, txPromise)

  return txPromise
}

function _waitForNonceToIncrement (nonce, from, getNonceFn, releaseLock, txPromise) {
  let intervalId

  // In case of an error, release lock and relaunch exception
  // txPromise.catch(error => {
  //   if (intervalId) {
  //     clearInterval(intervalId)
  //   }
  //   releaseLock()
  //   throw error
  // })

  try {
    if (isLocal) {
      setTimeout(releaseLock, 0)
    } else {
      intervalId = setInterval(() => {
        getNonceFn(from).then(newNonce => {
          logger.info(`Checking nonce update from: ${from}, ${nonce} - current nonce: ${newNonce}. Transactions in queue: ${pendingTransaction.length}`)
          // check if the transaction has been incremented
          if (newNonce === nonce + 1) {
            releaseLock()
            // The transaction is in the mempool
            clearInterval(intervalId)
          }
        })
      }, NONCE_INCREMENT_CHECK_TIME)
    }
  } catch (error) {
    logger.error('Error waiting for nonce increment: %s', error)
    console.error(error)
  }
}

module.exports = sendTxWithUniqueNonce
