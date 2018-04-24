const debug = require('debug')('tests:repositories:EthereumRepo')

const testSetup = require('../helpers/testSetup')
const blocks = require('../data/blocks').blocks

const setupPromise = testSetup()

test('It should allow to get token contract info', async () => {
  const { contracts, ethereumRepo } = await setupPromise

  // GIVEN Raiden Token contract address
  let rdnTokenAddress = contracts.erc20TokenContracts.RDN.address

  // WHEN we request tokenInfo using a token contract address
  let tokenInfo = await ethereumRepo.tokenGetInfo({
    tokenAddress: rdnTokenAddress
  })

  // THEN the token info received is the one we expect
  const EXPECTED_TOKEN_INFO = {
    symbol: 'RDN',
    name: 'Raiden Network Token',
    address: rdnTokenAddress,
    decimals: 18
  }
  expect(tokenInfo).toMatchObject(EXPECTED_TOKEN_INFO)
})

// Same test case for different values checking mid and edge cases
const BLOCK_TEST_CASES = [{
  blockNumber: 0,
  deltaTime: -3,
  expectedLastBlockBefore: null,
  expectedFirstBlockAfter: 0
}, {
  blockNumber: 0,
  deltaTime: 0,
  expectedLastBlockBefore: 0,
  expectedFirstBlockAfter: 0
}, {
  blockNumber: 0,
  deltaTime: 3,
  expectedLastBlockBefore: 0,
  expectedFirstBlockAfter: 1
}, {
  blockNumber: 15,
  deltaTime: -3,
  expectedLastBlockBefore: 14,
  expectedFirstBlockAfter: 15
}, {
  blockNumber: 15,
  deltaTime: 0,
  expectedLastBlockBefore: 15,
  expectedFirstBlockAfter: 15
}, {
  blockNumber: 15,
  deltaTime: 3,
  expectedLastBlockBefore: 15,
  expectedFirstBlockAfter: 16
}, {
  blockNumber: 90,
  deltaTime: -3,
  expectedLastBlockBefore: 89,
  expectedFirstBlockAfter: 90
}, {
  blockNumber: 90,
  deltaTime: 0,
  expectedLastBlockBefore: 90,
  expectedFirstBlockAfter: 90
}, {
  blockNumber: 90,
  deltaTime: 3,
  expectedLastBlockBefore: 90,
  expectedFirstBlockAfter: 91
}, {
  blockNumber: 99,
  deltaTime: -3,
  expectedLastBlockBefore: 98,
  expectedFirstBlockAfter: 99
}, {
  blockNumber: 99,
  deltaTime: 0,
  expectedLastBlockBefore: 99,
  expectedFirstBlockAfter: 99
}, {
  blockNumber: 99,
  deltaTime: 3,
  expectedLastBlockBefore: 99,
  expectedFirstBlockAfter: null
}]

// Launch parametrized test based in scenarios added to BLOCK_TEST_CASES
BLOCK_TEST_CASES.forEach(({ blockNumber, deltaTime,
  expectedLastBlockBefore, expectedFirstBlockAfter }) => {
  test('It should return for block ' + blockNumber +
  ' with deltaTime ' + deltaTime +
  ' \'' + expectedLastBlockBefore + '\' as the last block before ' +
  'and \'' + expectedFirstBlockAfter + '\' as the first block after',
  async () => {
    const { ethereumRepo } = await setupPromise

    // We mock the getBlock function in order to mock blocks to be deterministic
    ethereumRepo._ethereumClient.getBlock = _getBlock

    // GIVEN an origin block and a date
    const block = await ethereumRepo.getBlock(blockNumber)
    let date = new Date((block.timestamp + deltaTime) * 1000)

    // WHEN we check the last block before or after the date given
    let lastBlockBeforeDate = await ethereumRepo.getLastBlockBeforeDate(date)
    let firstBlockAfterDate = await ethereumRepo.getFirstBlockAfterDate(date)

    // THEN we get the expected values to our scenario
    expect(lastBlockBeforeDate).toEqual(expectedLastBlockBefore)
    expect(firstBlockAfterDate).toEqual(expectedFirstBlockAfter)
  })
})

// Mock function to getBlocks from data/blocks.js
function _getBlock (blockNumber) {
  if (blockNumber === 'latest') {
    return blocks[blocks.length - 1]
  } else {
    return blocks.find(block => {
      return block.number === blockNumber
    })
  }
}
