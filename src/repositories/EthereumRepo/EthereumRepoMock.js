class EthereumRepoMock {
  async tokenBalanceOf ({ tokenAddress, account }) {
    return 0.3 * 10 ** 18
  }

  async tokenTransfer ({ tokenAddress, account, amount }) {
    return true
  }
}

module.exports = EthereumRepoMock
