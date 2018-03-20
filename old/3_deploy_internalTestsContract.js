/* eslint no-multi-spaces: 0, no-console: 0 */

const Math = artifacts.require('Math')
const DutchExchange = artifacts.require('DutchExchange')
const InternalTests = artifacts.require('InternalTests')

module.exports = function deploy(deployer) {
  deployer.link(Math, InternalTests)
    .then(() => DutchExchange.deployed())
    .then((dx) => {
      const initParams = Promise.all([
        dx.frtToken.call(),
        dx.owlToken.call(),
        dx.owner.call(),
        dx.ethToken.call(),
        dx.ethUSDOracle.call(),
        dx.thresholdNewTokenPair.call(),
        dx.thresholdNewAuction.call(),
      ])


      return initParams
    }).then((initParams) => {
      return  deployer.deploy(InternalTests, ...initParams)
    })
}
