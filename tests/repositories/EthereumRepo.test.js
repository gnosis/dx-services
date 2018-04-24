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

const BLOCK_TEST_CASES = [{
  block: 0,
  deltaTime: -3,
  expectedValueLastBlockBefore: null,
  expectedValueFirstBlockAfter: 0
}, {
  block: 0,
  deltaTime: 0,
  expectedValueLastBlockBefore: 0,
  expectedValueFirstBlockAfter: 0
}, {
  block: 0,
  deltaTime: 3,
  expectedValueLastBlockBefore: 0,
  expectedValueFirstBlockAfter: 1
}, {
  block: 15,
  deltaTime: -3,
  expectedValueLastBlockBefore: 14,
  expectedValueFirstBlockAfter: 15
}, {
  block: 15,
  deltaTime: 0,
  expectedValueLastBlockBefore: 15,
  expectedValueFirstBlockAfter: 15
}, {
  block: 15,
  deltaTime: 3,
  expectedValueLastBlockBefore: 15,
  expectedValueFirstBlockAfter: 16
}, {
  block: 90,
  deltaTime: -3,
  expectedValueLastBlockBefore: 89,
  expectedValueFirstBlockAfter: 90
}, {
  block: 90,
  deltaTime: 0,
  expectedValueLastBlockBefore: 90,
  expectedValueFirstBlockAfter: 90
}, {
  block: 90,
  deltaTime: 3,
  expectedValueLastBlockBefore: 90,
  expectedValueFirstBlockAfter: 91
}, {
  block: 99,
  deltaTime: -3,
  expectedValueLastBlockBefore: 98,
  expectedValueFirstBlockAfter: 99
}, {
  block: 99,
  deltaTime: 0,
  expectedValueLastBlockBefore: 99,
  expectedValueFirstBlockAfter: 99
}, {
  block: 99,
  deltaTime: 3,
  expectedValueLastBlockBefore: 99,
  expectedValueFirstBlockAfter: null
}]

BLOCK_TEST_CASES.forEach(blockTest => {
  test('It should return for block ' + blockTest.block +
  ' with deltaTime ' + blockTest.deltaTime +
  ' \'' + blockTest.expectedValueLastBlockBefore + '\' as the last block before ' +
  'and \'' + blockTest.expectedValueFirstBlockAfter + '\' as the first block after',
  async () => {
    const { ethereumRepo } = await setupPromise

    ethereumRepo._ethereumClient.getBlock = _getBlock

    const blockNumber = blockTest.block
    const block = await ethereumRepo.getBlock(blockNumber)
    let date = new Date((block.timestamp + blockTest.deltaTime) * 1000)

    let lastBlockBeforeDate = await ethereumRepo.getLastBlockBeforeDate(date)
    let firstBlockAfterDate = await ethereumRepo.getFirstBlockAfterDate(date)

    expect(lastBlockBeforeDate).toEqual(blockTest.expectedValueLastBlockBefore)
    expect(firstBlockAfterDate).toEqual(blockTest.expectedValueFirstBlockAfter)
  })
})

function _getBlock (blockNumber) {
  if (blockNumber === 'latest') {
    return blocks[blocks.length - 1]
  } else {
    return blocks.find(block => {
      return block.number === blockNumber
    })
  }
}
