const Math = artifacts.require('Math')
const TokenOMG = artifacts.require('tokens/TokenOMG')
const TokenRDN = artifacts.require('tokens/TokenRDN')

module.exports = function deploy (deployer) {
  deployer.deploy(Math)
  deployer.link(Math, [ TokenOMG, TokenRDN ])

  deployer.deploy(TokenOMG, 100000 * (10 ** 18))
  deployer.deploy(TokenRDN, 100000 * (10 ** 18))
}
