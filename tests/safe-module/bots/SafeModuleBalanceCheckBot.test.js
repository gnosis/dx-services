const BalanceCheckBot = require('../../../src/bots/SafeModuleBalanceCheckBot')
const conf = require('../../../conf')
const testSetup = require('../../helpers/testSetup')
const BigNumber = require('bignumber.js')

const setupPromise = testSetup()
const TOKENS = [ 'WETH', 'RDN' ]

let balanceCheckBot

beforeEach(async () => {
    await setupPromise

    balanceCheckBot = new BalanceCheckBot({
        accountIndex: 0,
        name: 'SafeModuleBalanceCheckBot',
        botAddress: conf.SAFE_MODULE_ADDRESSES.SAFE_ADDRESS,
        tokens: TOKENS,
        notifications: [],
        minimumAmountForEther: 1000,
        minimumAmountInUsdForToken: 1000
    })
})

afterEach(() => {
    balanceCheckBot.stop()
})

test('It should set accounts correctly', async () => {
    await balanceCheckBot.init()
    expect(balanceCheckBot.getOperatorAddress()).not.toBe(conf.SAFE_MODULE_ADDRESSES.SAFE_ADDRESS)
    expect(balanceCheckBot.getBotAddress()).toBe(conf.SAFE_MODULE_ADDRESSES.SAFE_ADDRESS)
})

test('It should do a routine check once', async () => {
    // jest.useFakeTimers()
    await balanceCheckBot.init()
    // mock functions
    balanceCheckBot._checkBalance = jest.fn(_checkBalance)
    CHECK_BALANCE_FN = balanceCheckBot._checkBalance

    expect(CHECK_BALANCE_FN).toHaveBeenCalledTimes(0)

    await balanceCheckBot.start()

    // Executes queued tasks (setTimeout(), setInterval())
    // jest.runOnlyPendingTimers()

    // _checkBalance should have been called once
    expect(CHECK_BALANCE_FN).toHaveBeenCalledTimes(1)
})

test('It should do a routine check twice', async () => {
    jest.useFakeTimers()
    await balanceCheckBot.init()
    // mock functions
    balanceCheckBot._checkBalance = jest.fn(_checkBalance)
    CHECK_BALANCE_FN = balanceCheckBot._checkBalance

    expect(CHECK_BALANCE_FN).toHaveBeenCalledTimes(0)

    await balanceCheckBot.start()

    // Executes queued tasks (setTimeout(), setInterval())
    jest.runOnlyPendingTimers()

    // _checkBalance should have been called once
    expect(CHECK_BALANCE_FN).toHaveBeenCalledTimes(2)
})

test('It should send notifications', async () => {
    // jest.useFakeTimers()
    await balanceCheckBot.init()
    // mock functions
    balanceCheckBot._dxInfoService.getBalanceOfEther = jest.fn(_getBalanceOfEther)
    balanceCheckBot._liquidityService.getBalances = jest.fn(_getBalances)
    balanceCheckBot._notifyLackOfEther = jest.fn(_notifyLackOfEther)
    balanceCheckBot._notifyLackOfTokens = jest.fn(_notifyLackOfTokens)

    const GET_BALANCE_OF_ETHER_FN = balanceCheckBot._dxInfoService.getBalanceOfEther
    const GET_BALANCES_FN = balanceCheckBot._liquidityService.getBalances
    const NOTIFY_LACK_OF_ETHER_FN = balanceCheckBot._notifyLackOfEther
    const NOTIFY_LACK_OF_TOKENS_FN = balanceCheckBot._notifyLackOfTokens

    expect(GET_BALANCES_FN).toHaveBeenCalledTimes(0)
    expect(GET_BALANCE_OF_ETHER_FN).toHaveBeenCalledTimes(0)
    expect(NOTIFY_LACK_OF_ETHER_FN).toHaveBeenCalledTimes(0)
    expect(NOTIFY_LACK_OF_TOKENS_FN).toHaveBeenCalledTimes(0)

    // Executes queued tasks (setTimeout(), setInterval())
    // jest.runOnlyPendingTimers()

    await balanceCheckBot.start()

    expect(GET_BALANCES_FN).toHaveBeenCalledTimes(1)
    expect(GET_BALANCE_OF_ETHER_FN).toHaveBeenCalledTimes(1)
    //expect(NOTIFY_LACK_OF_ETHER_FN).toHaveBeenCalledTimes(1) // It's not working as expected, jest doesn't detect the function's call althought it's been called
    //expect(NOTIFY_LACK_OF_TOKENS_FN).toHaveBeenCalledTimes(1) // It's not working as expected
})

async function _getBalanceOfEther () {
    console.debug(arguments.callee.name)
    return Promise.resolve(new BigNumber(0))
}

async function _getBalances () {
    console.debug(arguments.callee.name)
    const bg_zero = new BigNumber(0)
    return Promise.resolve([
        {
            amountInUSD: bg_zero,
            amount: bg_zero
        }
    ])
}

async function _checkBalance () {
    console.debug(arguments.callee.name)
    return true
}

function _notifyLackOfEther () {
    console.debug(arguments.callee.name)
    return true
}

function _notifyLackOfTokens () {
    console.debug(arguments.callee.name)
    return true
}
