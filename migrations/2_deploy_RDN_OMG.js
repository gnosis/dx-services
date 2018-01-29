const Math = artifacts.require('Math')
const TokenOMG = artifacts.require('tokens/TokenOMG')
const TokenRDN = artifacts.require('tokens/TokenRDN')

module.exports = function deploy (deployer) {
  deployer.deploy(Math)
  deployer.link(Math, [ TokenOMG, TokenRDN ])

  deployer.deploy(TokenOMG)
  deployer.deploy(TokenRDN)
}
