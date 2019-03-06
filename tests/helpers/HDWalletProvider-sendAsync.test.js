const HDWalletProvider = require('../../src/helpers/web3Providers/HDWalletProvider')
const mnemonic = 'candy maple cake sugar pudding cream honey rich smooth crumble sweet treat'
const RPC_GET_VERSION = {
  jsonrpc: '2.0',
  method: 'web3_clientVersion',
  'params': [],
  'id': 67
}

const SUCCESS_RESULT = { message: 'Mock successful result' }
const ERROR_EXCEPTION = new Error('Mock error')
const SUCCESS_SEND_ASYNC = (params, callback) => callback(null, SUCCESS_RESULT)
const ERROR_SEND_ASYNC = (params, callback) => callback(ERROR_EXCEPTION)

let wallet
beforeAll(() => {
  wallet = new HDWalletProvider({
    mnemonic: mnemonic,
    url: 'http://fake-url.com'
  })

  // Mock send async function
  wallet.engine.sendAsync = jest.fn()
})

beforeEach(() => {
  jest.resetAllMocks()
})

beforeEach(() => {
  // Clear all instances and calls to constructor and all methods
  wallet.engine.sendAsync.mockClear()
})

describe('Send transaction, delegates the to the wallet', () => {
  test.only('It delegates for successful requests', done => {
    // GIVEN: An engine that succeed on sendAsync
    wallet.engine.sendAsync.mockImplementation(SUCCESS_SEND_ASYNC)

    // WHEN: Sending a "get version" call
    wallet.sendAsync(RPC_GET_VERSION, (error, result) => {
      // THEN: The wallet delegates to the engine
      expect(wallet.engine.sendAsync).toHaveBeenCalledTimes(1)
      const params = wallet.engine.sendAsync.mock.calls[0][0]
      expect(params).toBe(RPC_GET_VERSION)

      // THEN: The result is returned
      expect(result).toBe(SUCCESS_RESULT)
      expect(error).toBeFalsy()

      done()
    })
  })

  test.only('It delegates for erroneus requests', done => {
    // GIVEN: An engine that succeed on sendAsync
    wallet.engine.sendAsync.mockImplementation(ERROR_SEND_ASYNC)

    // WHEN: Sending a "get version" call
    wallet.sendAsync(RPC_GET_VERSION, (error, result) => {
      // THEN: The wallet delegates to the engine
      expect(wallet.engine.sendAsync).toHaveBeenCalledTimes(1)
      const params = wallet.engine.sendAsync.mock.calls[0][0]
      expect(params).toBe(RPC_GET_VERSION)

      // THEN: The result is returned
      expect(error).toBe(ERROR_EXCEPTION)
      expect(result).toBeFalsy()

      done()
    })
  })
})
