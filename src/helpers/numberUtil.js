const BigNumber = require('bignumber.js')

const ZERO = new BigNumber(0)
const ONE = new BigNumber(1)
const HUNDRED = new BigNumber(100)
const TEN_EXP_18 = new BigNumber(1e18)

function toBigNumber (num) {
  return isBigNumber(num) ? num : new BigNumber(num)
}

function toBigNumberFraction (fraction, inDecimal = true) {
  if (fraction) {
    if (inDecimal) {
      // In decimal format
      return (new BigNumber(fraction.numerator))
        .div(fraction.denominator)
    } else {
      // In fractional format
      return {
        numerator: new BigNumber(fractionBigNumber.numerator),
        denominator: new BigNumber(fractionBigNumber.denominator)
      }
    }
  } else {
    return null
  }
}

function isBigNumber (n) {
  // The current version of bignumber is too old and doesn't have isBigNumber method
  // It cannot be updated due to web3
  return n instanceof BigNumber
}

function toWei (num) {
  return toBigNumber(num).mul(TEN_EXP_18)
}

function fromWei (num) {
  return toBigNumber(num).div(TEN_EXP_18)
}

module.exports = {
  toBigNumber,
  isBigNumber,
  toBigNumberFraction,
  toWei,
  fromWei,

  // some convenience constants
  ONE,
  ZERO,
  HUNDRED,
  TEN_EXP_18
}
