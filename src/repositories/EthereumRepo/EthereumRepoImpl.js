const loggerNamespace = 'dx-service:repositories:EthereumRepoImpl'
const Logger = require('../../helpers/Logger')
const logger = new Logger(loggerNamespace)
// const AuctionLogger = require('../../helpers/AuctionLogger')
// const auctionLogger = new AuctionLogger(loggerNamespace)

// See: https://github.com/ethereum/eips/issues/20
const ERC20_ABI = require('./ERC20Abi')

const tokenContractsCache = {}

class EthereumRepoImpl {
  constructor ({ ethereumClient }) {
    this._ethereumClient = ethereumClient
    this._web3 = ethereumClient.getWeb3()
    this._erc20Contract = this._web3.eth.contract(ERC20_ABI)
  }

  async isConnected () {
    return this._ethereumClient.isConnected()
  }

  async isSyncing () {
    return this._ethereumClient.isSyncing()
  }

  async getAccounts () {
    return this._ethereumClient.getAccounts()
  }

  async getHealth () {
    return Promise
      .all([
        // this._ethereumClient.doCall('isConnected')
        this._ethereumClient.doCall('version.getNode'),
        this._ethereumClient.doCall('net.getListening'),
        this._ethereumClient.doCall('version.getNetwork'),
        this._ethereumClient.getBlockNumber(),
        this._ethereumClient.geLastBlockTime(),
        this._ethereumClient.doCall('net.getPeerCount')
        // FIXME: Fails because promisfy mess up with the "this" so "this" is undefined instead of "web3.eth"
        // this._ethereumClient.doCall('eth.isSyncing')
      ]).then(([
        node,
        isListening,
        network,
        lastBlockNumber,
        lastBlockTime,
        peerCount
        // isSyncing
      ]) => ({
        node,
        host: this._ethereumClient.getUrl(),
        isListening,
        network,
        lastBlockNumber,
        lastBlockTime,
        peerCount
        // isSyncing,
      }))
    /*
    return {
      node: this._ethereumClient._web3.version.node,
      
      isConnected: await this._ethereumClient.doCall('isConnected'),

      isSyncing: await 
      network: await this._ethereumClient.doCall('version.getNetwork'),
      ethereumVersion: await this._ethereumClient.doCall('version.ethereum'),
      whisperVersion: await this._ethereumClient.doCall('version.whisper'),
      peerCount: await this._ethereumClient.doCall('eth.getPeerCount')
    }
    */
  }

  async getGasPrice () {
    this._ethereumClient.doCall('eth.gasPrice')
  }

  async getAbout () {
    return Promise
      .all([
        this._ethereumClient.doCall('version.getNode'),
        this._ethereumClient.doCall('version.getNetwork'),
        this._ethereumClient.doCall('version.getEthereum')
      ])
      .then(([ node, network, ethereumVersion ]) => ({
        node,
        host: this._ethereumClient.getUrl(),
        network,
        ethereumVersion
      }))
  }

  async balanceOf ({ account }) {
    return this._ethereumClient.balanceOf(account)
  }

  async tokenBalanceOf ({ tokenAddress, account }) {
    logger.debug({
      msg: 'Get balance for token %s and account %s',
      params: [ tokenAddress, account ]
    })
    const tokenContract = this._getTokenContract(tokenAddress)
    return promisify(tokenContract.balanceOf.call, account)
  }

  async tokenTransfer ({ tokenAddress, account, amount }) {
    const tokenContract = this._getTokenContract(tokenAddress)
    return promisify(tokenContract.transfer, account, amount)
  }

  async tokenTransferFrom ({ tokenAddress, from, to, amount }) {
    const tokenContract = this._getTokenContract(tokenAddress)
    return promisify(tokenContract.transferFrom, from, to, amount)
  }

  async tokenApprove ({ tokenAddress, spender, amount }) {
    const tokenContract = this._getTokenContract(tokenAddress)
    return promisify(tokenContract.approve, spender, amount)
  }

  async tokenAllowance ({ tokenAddress, owner, spender }) {
    const tokenContract = this._getTokenContract(tokenAddress)
    return promisify(tokenContract.allowance, owner, spender)
  }

  async tokenTotalSupply ({ tokenAddress }) {
    const tokenContract = this._getTokenContract(tokenAddress)
    return promisify(tokenContract.totalSupply)
  }

  _getTokenContract (address) {
    let contract = tokenContractsCache[address]

    if (!contract) {
      contract = this._erc20Contract.at(address)
      tokenContractsCache[address] = contract
    }

    return contract
  }
}

async function promisify (fn, ...params) {
  return new Promise((resolve, reject) => {
    const callback = (error, ...data) => {
      if (error) {
        reject(error)
      } else {
        resolve(...data)
      }
    }
    fn(...params, callback)
  })
}

module.exports = EthereumRepoImpl
