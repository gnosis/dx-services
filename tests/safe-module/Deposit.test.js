const Web3 = require('web3')
const conf = require('../../conf')
const HDWalletProvider = require('../../src/helpers/web3Providers/HDWalletProvider')
const testSetup = require('../helpers/testSetup')

const setupPromise = testSetup()
const safeAddress = conf.SAFE_ADDRESS
const minSafeBalance = 1 // ETH
let dxOperator, currentSnapshotId, hdWalletProvider

beforeEach(async (done) => {
  const {
    MNEMONIC,
    ETHEREUM_RPC_URL
  } = conf

  const { ethereumClient } = await setupPromise

  currentSnapshotId = await ethereumClient.makeSnapshot()

  // Create a classic HDWalletProvider instance
  hdWalletProvider = new HDWalletProvider({
    mnemonic: MNEMONIC,
    url: ETHEREUM_RPC_URL,
    addressIndex: 0,
    numAddresses: 5
  })

  // Create a web3 using the HDWalletProvider instead of the Safe's one
  const web3 = new Web3(hdWalletProvider)
  dxOperator = hdWalletProvider.addresses[1]

  web3.eth.getBalance(safeAddress, async (e, safeBalance) => {
    if (!e) {
      console.debug(`Safe Balance: ${safeBalance.div(1e18)} ETH`)

      if (safeBalance.div(1e18).lte(minSafeBalance)) {
        // Send ETH to the Safe
        web3.eth.sendTransaction({
          from: dxOperator,
          to: safeAddress,
          value: web3.toWei(1, 'ether')
        }, async (e, response) => {
          if (!e) {
            console.debug("\nFund transaction sent to Safe\n")
          } else {
            throw e
          }
          done()
        })
      } else {
        done()
      }
    } else {
      throw e
    }
  })
})

afterEach(async () => {
  const { ethereumClient } = await setupPromise
  return ethereumClient.revertSnapshot(currentSnapshotId)
})

test('It should wrap ETH into WETH and deposit into the DX, buy and sell WETH => RDN', async () => {
  const { dxInfoService, dxTradeService, ethereumClient } = await setupPromise
  const safeETHBalanceBefore = await ethereumClient.balanceOf(safeAddress)
  const safeWETHBalanceBefore = await dxInfoService.getAccountBalanceForToken({ token: 'WETH', address: safeAddress })
  const dxOperatorBalanceBefore = await dxInfoService.getAccountBalanceForToken({ token: 'WETH', address: dxOperator })
  const depositAmount = 1e9

  // Deposit passing through the Safe
  const txResult = await dxTradeService.deposit({
    token: 'WETH',
    amount: depositAmount,
    accountAddress: safeAddress
  })

  expect(txResult).not.toBe(null)
  expect(parseInt(txResult.receipt.status)).toBe(1)
  const safeETHBalanceAfter = await ethereumClient.balanceOf(safeAddress)
  const safeWETHBalanceAfter = await dxInfoService.getAccountBalanceForToken({ token: 'WETH', address: safeAddress })
  const dxOperatorBalanceAfter = await dxInfoService.getAccountBalanceForToken({ token: 'WETH', address: dxOperator })

  expect(safeETHBalanceBefore.toNumber()).toBeGreaterThan(safeETHBalanceAfter.toNumber()) // Safe must have spent ${depositAmount} ETH
  expect(safeWETHBalanceAfter.toNumber()).toBe(safeWETHBalanceBefore.plus(depositAmount).toNumber()) // Safe must have more WETH
  expect(dxOperatorBalanceAfter.toNumber()).toBe(dxOperatorBalanceBefore.toNumber()) // operator's WETH balance doesn't change
})