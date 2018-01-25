const Web3 = require('web3')
const contract = require('truffle-contract')
const dutchExchangeJson = require('../../build/contracts/DutchExchange.json')
const DutchExchange = contract(dutchExchangeJson)

const provider = new Web3.providers.HttpProvider('http://127.0.0.1:8545')
DutchExchange.setProvider(provider)

DutchExchange.deployed()
  .then(dxInstance => {
    return dxInstance.owner.call()
  })
  .then(owner => {
    console.log('The dutch exchange is owned by: ' + owner)
  })
