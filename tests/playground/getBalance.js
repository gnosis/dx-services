const Web3 = require('web3')
const contract = require('truffle-contract')
const dutchExchangeJson = require('../../build/contracts/DutchExchange.json')
const DutchExchange = contract(dutchExchangeJson)

const provider = new Web3.providers.HttpProvider('http://127.0.0.1:8545')
DutchExchange.setProvider(provider)

const address = '0x424a46612794dbb8000194937834250Dc723fFa5'
const OWL = '0x32e82e26908de2935e0ef5a265106ecc446fa972'

DutchExchange.deployed()
  .then(dxInstance => {
    return dxInstance.balances.call(OWL, address)
  })
  .then(balance => {
    console.log('The balance for ' + address + ': ' + balance)
  })
