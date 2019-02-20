// const Logger = require('./helpers/Logger')
// const logger = new Logger('dx-service:web3')
const Web3 = require('web3')
const getWeb3Provider = require('../web3Providers')

let web3

module.exports = async () => {
  if (!web3) {
    const provider = await getWeb3Provider()
    web3 = new Web3(provider)
  }

  return web3
}
