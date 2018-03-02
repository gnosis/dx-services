const BigNumber = require('bignumber.js')

function toBigNumber (num) {
  return (num instanceof BigNumber) ? num : new BigNumber(num)
}

module.exports = {
  toBigNumber
}
