const debug = require('debug')('tests:repositories:EthereumRepo')

const testSetup = require('../helpers/testSetup')

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
