const loggerNamespace = 'dx-service:repositories:EthereumRepoImpl'
const Logger = require('../../helpers/Logger')
const dateUtil = require('../../helpers/dateUtil')
const formatUtil = require('../../helpers/formatUtil')
const logger = new Logger(loggerNamespace)
// const AuctionLogger = require('../../helpers/AuctionLogger')
// const auctionLogger = new AuctionLogger(loggerNamespace)

// See: https://github.com/ethereum/eips/issues/20
const ERC20_ABI = require('./ERC20Abi')

const SECONDS_PER_BLOCK = 15
const CLOSE_POINT_PERCENTAGE = 0.9
const FAR_POINT_PERCENTAGE = 1 - CLOSE_POINT_PERCENTAGE

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

  async getGasPricesGWei () {
    // this._ethereumClient.doCall('eth.gasPrice')
    return this._ethereumClient.getGasPricesGWei()
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

  async tokenGetInfo ({ tokenAddress }) {
    const [ symbol, name, decimals ] = await Promise.all([
      this.tokenGetSymbol({ tokenAddress }),
      this.tokenGetName({ tokenAddress }),
      this.tokenGetDecimals({ tokenAddress })
    ])
    return {
      // TODO remove when ensured using EtherToken contract with WETH symbol
      symbol: symbol !== 'ETH' ? symbol : 'WETH',
      name,
      address: tokenAddress,
      decimals
    }
  }

  async tokenGetSymbol ({ tokenAddress }) {
    const tokenContract = this._getTokenContract(tokenAddress)
    return promisify(tokenContract.symbol)
  }

  async tokenGetName ({ tokenAddress }) {
    const tokenContract = this._getTokenContract(tokenAddress)
    return promisify(tokenContract.name)
  }

  async tokenGetDecimals ({ tokenAddress }) {
    const tokenContract = this._getTokenContract(tokenAddress)
    return promisify(tokenContract.decimals)
      .then(parseInt)
  }

  async getBlock (blockNumber) {
    return this._ethereumClient.getBlock(blockNumber)
  }

  async getFirstBlockAfterDate (date) {
    logger.debug('Find first block after %s',
      formatUtil.formatDateTime(date)
    )
    const latestBlock = await this._ethereumClient.getBlock('latest')
    const latestBlockNumber = latestBlock.number

    return this._getFirstBlockAfterDate(date, 0, latestBlockNumber,
      latestBlockNumber, true)
  }

  async getLastBlockBeforeDate (date) {
    logger.debug('Find first block after %s',
      formatUtil.formatDateTime(date)
    )
    const latestBlock = await this._ethereumClient.getBlock('latest')
    const latestBlockNumber = latestBlock.number

    return this._getFirstBlockAfterDate(date, 0, latestBlockNumber,
      latestBlockNumber, false)
  }

  async _getFirstBlockAfterDate (
    date,
    firstBlockRange,
    referenceBlock,
    lastBlockRange,
    lookingForBlockAfterDate
  ) {
    return 0

    logger.debug('Looking between %s and %s',
      formatUtil.formatNumber(firstBlockRange),
      formatUtil.formatNumber(lastBlockRange)
    )
    const block = await this._ethereumClient.getBlock(referenceBlock)
    const blockDate = new Date(block.timestamp * 1000)
    const seccondsDifference = dateUtil.diff(blockDate, date, 'seconds')
    const blocksDifference = seccondsDifference / SECONDS_PER_BLOCK

    logger.debug(' * Reference block %s has date %s. Difference:',
      formatUtil.formatNumber(referenceBlock),
      formatUtil.formatDateTime(blockDate),
      formatUtil.formatDatesDifference(blockDate, date)
    )

    let nextFirstBlockRange, nextReferenceBlock, nextLastBlockRange
    if (seccondsDifference === 0) {
      return referenceBlock
    } else if (seccondsDifference > 0) {
      // Between the reference and the last block
      nextFirstBlockRange = referenceBlock + (lookingForBlockAfterDate ? 1 : 0)
      nextReferenceBlock = Math.ceil(referenceBlock + blocksDifference)
      nextLastBlockRange = lastBlockRange

      if (nextReferenceBlock >= lastBlockRange) {
        // Time estimation can be innacurate, especially when we are closing the range
        // In case we set as the new reference a block close to the last block
        nextReferenceBlock = Math.ceil(
          nextFirstBlockRange * FAR_POINT_PERCENTAGE +
          nextLastBlockRange * CLOSE_POINT_PERCENTAGE
        )
      }
    } else {
      // Between the first and the reference
      nextFirstBlockRange = firstBlockRange
      nextReferenceBlock = Math.floor(referenceBlock + blocksDifference)
      nextLastBlockRange = referenceBlock + (lookingForBlockAfterDate ? 0 : -1)

      if (nextReferenceBlock <= firstBlockRange) {
        // Time estimation can be innacurate, especially when we are closing the range
        // In case we set as the new reference a block close to the first block
        nextReferenceBlock = Math.floor(
          nextFirstBlockRange * CLOSE_POINT_PERCENTAGE +
          nextLastBlockRange * FAR_POINT_PERCENTAGE
        )
      }
    }

    const numRemainingBlocks = 1 + nextLastBlockRange - nextFirstBlockRange
    if (numRemainingBlocks < 1) {
      // There's no block that match the criteria
      return null
    } else if (numRemainingBlocks === 1) {
      // We found the block, the only one we've got
      logger.debug(' * Nice we found the block: %s',
        formatUtil.formatNumber(nextFirstBlockRange)
      )
      return nextFirstBlockRange
    } else if (numRemainingBlocks === 2) {
      // We found the block:
      logger.debug(' * Nice we found the block: %s',
        formatUtil.formatNumber(nextFirstBlockRange)
      ) 
    } else {
      // We must continue looking
      const jumpInBlocks = nextReferenceBlock - referenceBlock
      logger.debug(' * Moving %s %s positions the reference block',
        jumpInBlocks > 0 ? 'ahead' : 'back',
        formatUtil.formatNumber(Math.abs(jumpInBlocks))
      )
      logger.debug(' * We have to keep looking, still %s candidate blocks',
        formatUtil.formatNumber(nextLastBlockRange - nextFirstBlockRange)
      )
      return this._getFirstBlockAfterDate(
        date,
        nextFirstBlockRange,
        nextReferenceBlock,
        nextLastBlockRange,
        lookingForBlockAfterDate
      )
    }
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
