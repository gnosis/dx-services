const BigNumber = require('bignumber.js')

const ZERO = new BigNumber(0)
const ONE = new BigNumber(1)
const TEN = new BigNumber(10)
const HUNDRED = new BigNumber(100)
const TEN_EXP_18 = new BigNumber(1e18)

const DEFAULT_TOKEN_DECIMALS = 18
const DEFAULT_DECIMALS = 2

function toBigNumber (num) {
  return isBigNumber(num) ? num : new BigNumber(num.toString())
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
        numerator: new BigNumber(fraction.numerator),
        denominator: new BigNumber(fraction.denominator)
      }
    }
  } else {
    return null
  }
}

function toDecimal (num, decimal) {
  return toBigNumber(num).div(10 ** decimal)
}

function isBigNumber (n) {
  // The current version of bignumber is too old and doesn't have isBigNumber method
  // It cannot be updated due to web3
  return n instanceof BigNumber
}

function toWei (num, decimals) {
  return toBigNumber(num).mul(TEN.toPower(decimals || DEFAULT_TOKEN_DECIMALS))
}

function fromWei (num, decimals) {
  return toBigNumber(num).div(TEN.toPower(decimals || DEFAULT_TOKEN_DECIMALS))
}

function getPercentage ({ part, total }) {
  const partBN = toBigNumber(part)
  const totalBN = toBigNumber(total)
  if (!totalBN.isZero()) {
    return round(
      partBN.div(totalBN).mul(HUNDRED)
    )
  } else {
    return null
  }
}

function getIncrement ({ oldValue, newValue }) {
  const oldValueBN = toBigNumber(oldValue)
  const newValueBN = toBigNumber(newValue)

  if (oldValueBN && !oldValueBN.isZero()) {
    return round(
      HUNDRED
        .mul(newValueBN.minus(oldValue))
        .div(oldValue)
    )
  } else {
    return null
  }
}

function round (number, decimals) {
  return roundAux(number, decimals || DEFAULT_DECIMALS, 'round')
}
function roundUp (number, decimals) {
  return roundAux(number, decimals || DEFAULT_DECIMALS, 'ceil')
}
function roundDown (number, decimals) {
  return roundAux(number, decimals || DEFAULT_DECIMALS, 'floor')
}

function roundAux (number, decimals, roundFnName) {
  const factor = 10 ** (decimals || DEFAULT_DECIMALS)

  return toBigNumber(number)
    .mul(factor)[roundFnName]()
    .div(factor)
}

module.exports = {
  toBigNumber,
  isBigNumber,
  toBigNumberFraction,
  getPercentage,
  getIncrement,
  round,
  roundUp,
  roundDown,
  toWei,
  fromWei,
  toDecimal,

  // some convenience constants
  ONE,
  ZERO,
  TEN,
  HUNDRED,
  TEN_EXP_18
}
