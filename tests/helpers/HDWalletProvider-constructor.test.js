const HDWalletProvider = require('../../src/helpers/web3Providers/HDWalletProvider')

const mnemonic = 'candy maple cake sugar pudding cream honey rich smooth crumble sweet treat'
const privateKeys = [
  '0xc87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3',
  '0xae6ae8e5ccbfb04590405997ee2d52d2b330726137b875053c36d94e974d162f',
  '0x0dbbe8e4ae425a6d2687f1a7e3ba17bc98c673636790f1b8ad91193c05875ef1'
]
// const [pk1, pk2, pk3] = privateKeys
const addresses = [
  '0x627306090abab3a6e1400e9345bc60c78a8bef57',
  '0xf17f52151ebef6c7334fad080c5704d77216b732',
  '0xc5fdf4076b8f3a5357c5e395ab970b5b54098fef'
]
const [address1, address2, address3] = addresses

const WALLET_DEFAULTS = {
  url: 'http://127.0.0.1:8545',
  addressIndex: 0,
  numAddresses: 3,
  shareNonce: true,
  blockForNonceCalculation: 'pending'
}

// beforeAll(() => {
// })

describe('Constructor validations', () => {
  test('It throws an error if no mnemonic or private key was provided', () => {
    expect(() => new HDWalletProvider({
      ...WALLET_DEFAULTS
    })).toThrow()
  })
})

describe('Mnemonic account setup', () => {
  // Applies only to tests in this describe block
  test('It generate 1 account', () => {
    // GIVEN: A mnemonic and numAddresses=1
    const config = {
      ...WALLET_DEFAULTS,
      numAddresses: 1,
      mnemonic
    }

    // WHEN: Creating the wallet
    const wallet = new HDWalletProvider(config)

    // THEN: It returns the right address
    expect(wallet.getAddresses()).toEqual([address1])
  })

  test('It generate 3 accounts', () => {
    // GIVEN: A mnemonic and numAddresses=3
    const config = {
      ...WALLET_DEFAULTS,
      numAddresses: 3,
      mnemonic
    }

    // WHEN: Creating the wallet
    const wallet = new HDWalletProvider(config)

    // THEN: The addresses are the expected ones
    expect(wallet.getAddresses()).toEqual(addresses)
    expect(wallet.getAddress(0)).toEqual(address1)
    expect(wallet.getAddress(1)).toEqual(address2)
    expect(wallet.getAddress(2)).toEqual(address3)
  })
})

describe('Private key account setup', () => {
  // Applies only to tests in this describe block
  test('It generate 1 account', () => {
    // GIVEN: A private key
    const pk3 = privateKeys[2]
    const config = {
      ...WALLET_DEFAULTS,
      numAddresses: 1,
      privateKeys: [pk3]
    }

    // WHEN: Creating the wallet
    const wallet = new HDWalletProvider(config)

    // THEN: Returns the expected address
    expect(wallet.getAddresses()).toEqual([address3])
  })

  test('It generate 3 accounts', () => {
    // GIVEN: A tree private keys
    const config = {
      ...WALLET_DEFAULTS,
      numAddresses: 3,
      privateKeys
    }

    // WHEN: Creating the wallet
    const wallet = new HDWalletProvider(config)

    // THEN: Returns the expected addresses
    expect(wallet.getAddresses()).toEqual(addresses)
    expect(wallet.getAddress(0)).toEqual(address1)
    expect(wallet.getAddress(1)).toEqual(address2)
    expect(wallet.getAddress(2)).toEqual(address3)
  })
})
