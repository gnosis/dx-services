const DepositBot = require('../../src/bots/DepositBot')

const testSetup = require('../helpers/testSetup')
const setupPromise = testSetup()

const BigNumber = require('bignumber.js')

const TOKENS_BY_ACCOUNT = {
  '0': {
    tokens: [ 'WETH', 'RDN' ]
  }
}

let depositBot

beforeEach(async () => {
  const { dxInfoService, dxTradeService, ethereumClient } = await setupPromise

  depositBot = new DepositBot({
    name: 'DepositBot',
    dxInfoService,
    dxTradeService,
    ethereumClient,
    tokensByAccount: TOKENS_BY_ACCOUNT,
    notifications: []
  })

  depositBot._depositFunds = jest.fn(depositBot._depositFunds)
    .mockReturnValueOnce(true)
  depositBot.start()
})

afterEach(() => {
  depositBot.stop()
})

// FIXME: Bad mixture of promises and fake timers it doesn't work
// test('It should do a routine check.', async () => {
//   jest.useFakeTimers()
//
//   // we mock getAccountBalancesForTokensNotDeposited function
//   depositBot._dxInfoService.getAccountBalancesForTokensNotDeposited = jest.fn(_getAccountBalancesForTokensNotDeposited)
//   const GET_TOKEN_BALANCES_FN = depositBot._dxInfoService.getAccountBalancesForTokensNotDeposited
//
//   // GIVEN never ensured liquidity market
//   expect(GET_TOKEN_BALANCES_FN).toHaveBeenCalledTimes(0)
//
//   // WHEN we wait for an expected time
//   jest.runOnlyPendingTimers()
//
//   // THEN bot autochecked liquidity for all markets just in case
//   // expect(GET_TOKEN_BALANCES_FN).toHaveBeenCalledTimes(2)
// })

test('It should not do a deposit if nothing to deposit.', async () => {
  expect.assertions(7)

  // we mock getBalanceOfEther function
  depositBot._dxInfoService.getBalanceOfEther =
    jest.fn(depositBot._dxInfoService.getBalanceOfEther)
  const GET_ETHER_BALANCE_FN = depositBot._dxInfoService.getBalanceOfEther
  GET_ETHER_BALANCE_FN.mockImplementationOnce(_getEtherBalanceWithNoEthToDeposit)

  // we mock getAccountBalancesForTokensNotDeposited function
  depositBot._dxInfoService.getAccountBalancesForTokensNotDeposited =
    jest.fn(depositBot._dxInfoService.getAccountBalancesForTokensNotDeposited)
  const GET_TOKEN_BALANCES_FN =
    depositBot._dxInfoService.getAccountBalancesForTokensNotDeposited
  GET_TOKEN_BALANCES_FN.mockImplementationOnce(_getAccountBalancesWithNoTokensToDeposit)

  // we mock ensureSellLiquidity function
  depositBot._dxTradeService.deposit = jest.fn(depositBot._dxTradeService.deposit)
  const DEPOSIT_FN = depositBot._dxTradeService.deposit
  DEPOSIT_FN.mockImplementationOnce(_deposit)

  // GIVEN a never checked balances for deposit
  expect(GET_ETHER_BALANCE_FN).toHaveBeenCalledTimes(0)
  expect(GET_TOKEN_BALANCES_FN).toHaveBeenCalledTimes(0)
  expect(DEPOSIT_FN).toHaveBeenCalledTimes(0)

  // WHEN we check for funds for depositing
  const CHECK_DEPOSIT = depositBot._depositFunds()

  // THEN no deposit should be done because there are no funds
  await CHECK_DEPOSIT.then(result => {
    expect(result).toBeFalsy()
  })
  expect(GET_ETHER_BALANCE_FN).toHaveBeenCalledTimes(1)
  expect(GET_TOKEN_BALANCES_FN).toHaveBeenCalledTimes(1)
  expect(DEPOSIT_FN).toHaveBeenCalledTimes(0)
})

test('It should do a deposit.', async () => {
  expect.assertions(3)
  // we mock ensureSellLiquidity function
  depositBot._dxTradeService.deposit = jest.fn(depositBot._dxTradeService.deposit)
  const DEPOSIT_FN = depositBot._dxTradeService.deposit
  DEPOSIT_FN.mockImplementationOnce(_deposit)

  // GIVEN a never checked balances for deposit
  expect(DEPOSIT_FN).toHaveBeenCalledTimes(0)

  // WHEN we check for funds for depositing
  const CHECK_DEPOSIT = depositBot._depositFunds()

  // THEN the funds were deposited correctly
  await CHECK_DEPOSIT.then(result => {
    expect(result).toBeTruthy()
  })
  expect(DEPOSIT_FN).toHaveBeenCalledTimes(1)
})

// test('It should handle errors if something goes wrong.', () => {
//   expect.assertions(3)
//   // we mock ensureSellLiquidity function
//   depositBot._liquidityService.ensureSellLiquidity = jest.fn(_ensureLiquidityError)
//   depositBot._handleError = jest.fn(depositBot._handleError)
//   const HANDLE_ERROR_FN = depositBot._handleError
//
//   // GIVEN never called handling error function
//   expect(HANDLE_ERROR_FN).toHaveBeenCalledTimes(0)
//
//   // WHEN we ensure liquidity but an error is thrown
//   const ENSURE_LIQUIDITY = depositBot._ensureSellLiquidity({
//     buyToken: 'RDN', sellToken: 'WETH', from: '0x123' })
//
//   // THEN liquidity can't be ensured
//   ENSURE_LIQUIDITY.then(result => {
//     expect(result).toBeFalsy()
//   })
//   // THEN handling error function is called
//   expect(HANDLE_ERROR_FN).toHaveBeenCalledTimes(1)
// })

function _getAccountBalancesForTokensNotDeposited ({ tokens, account }) {
  console.log('Mocking get account balances for tokens not deposited')
  return Promise.resolve([{
    token: 'RDN',
    amount: new BigNumber('522943983903581200')
  }])
}

function _getEtherBalanceWithNoEthToDeposit ({ account }) {
  return Promise.resolve([
    new BigNumber('0')
  ])
}

function _getAccountBalancesWithNoTokensToDeposit ({ tokens, account }) {
  return Promise.resolve([{
    token: 'RDN',
    amount: new BigNumber('0')
  }])
}

function _deposit ({ token, amount, accounAddress }) {
  return Promise.resolve([])
}

function _ensureLiquidityError ({ sellToken, buyToken, from }) {
  throw Error('This is an EXPECTED test error')
}
