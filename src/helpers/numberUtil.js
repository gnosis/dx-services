const BigNumber = require('bignumber.js')

function toBigNumber (num) {
  return isBigNumber(num) ? num : new BigNumber(num)
}

function isBigNumber (n) {
  // The current version of bignumber is too old and doesn't have isBigNumber method
  // It cannot be updated due to web3
  return n instanceof BigNumber
}

function toWei (num) {
  return toBigNumber(num).mul(1e18)
}

function fromWei (num) {
  return toBigNumber(num).div(1e18)
}

module.exports = {
  toBigNumber,
  isBigNumber,
  toWei,
  fromWei
}
