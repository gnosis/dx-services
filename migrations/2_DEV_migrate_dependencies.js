/* global artifacts, web3 */
/* eslint no-undef: "error" */

const migrationsDx = require('@gnosis.pm/dx-contracts/src/migrations-truffle-4')

module.exports = (deployer, network, accounts) => {
  if (network === 'development') {
    const TokenRDN = artifacts.require('TokenRDN')
    const TokenOMG = artifacts.require('TokenOMG')

    const deployParams = {
      artifacts,
      deployer,
      network,
      accounts,
      web3,
      initialTokenAmount: process.env.GNO_TOKEN_AMOUNT,
      gnoLockPeriodInHours: process.env.GNO_LOCK_PERIOD_IN_HOURS,
      thresholdNewTokenPairUsd: process.env.GNO_LOCK_PERIOD_IN_HOURS,
      thresholdAuctionStartUsd: process.env.GNO_LOCK_PERIOD_IN_HOURS
    }

    deployer
      .then(() => migrationsDx(deployParams))
      .then(() => deployer.deploy(TokenRDN, accounts[0]))
      .then(() => deployer.deploy(TokenOMG, accounts[0]))
  } else {
    throw new Error(
      'Migrations are just for development. Current network is %s',
      network
    )
  }
}
