const numberUtil = require('./numberUtil')
const moment = require('moment')

function formatDateTime (date) {
  return date ? moment(date).format('MM/D/YY H:mm') : null
}

function formatDatesDifference (date1, date2) {
  return moment.duration(moment(date1).diff(moment(date2))).humanize()
}

function formatBoolean (flag) {
  return flag ? 'Yes' : 'No'
}

function formatFromWei (wei) {
  if (wei) {
    return numberUtil.toBigNumber(wei).div(1e18)
  } else {
    return null
  }
}

function formatNumber (number) {
  // TODO: Improve
  return number.toString()
}

function formatFraction (fraction, inDecimal = true) {
  if (!fraction) {
    return null
  } else {
    if (inDecimal) {
      // In decimal format
      const decimalumber = numberUtil.toBigNumberFraction(fraction, true)
      return formatNumber(decimalumber)
    } else {
      // In fractional format
      return formatNumber(fraction.numerator) +
        ' / ' +
        formatNumber(fraction.denominator)
    }
  }
}

function formatMarketDescriptor ({ tokenA, tokenB }) {
  if (tokenA < tokenB) {
    return tokenA + '-' + tokenB
  } else {
    return tokenB + '-' + tokenA
  }
}

function tokenPairSplit (tokenPair) {
  let splittedPair = tokenPair.toUpperCase().split('-')
  if (splittedPair.length === 2) {
    const [sellToken, buyToken] = splittedPair
    return {
      sellToken,
      buyToken
    }
  } else {
    const error = new Error('Invalid token pair format. Valid format is <sellToken>-<buyToken>')
    error.type = 'INVALID_TOKEN_FORMAT'
    error.status = 412
    throw error
  }
}

module.exports = {
  tokenPairSplit
}

module.exports = {
  formatDateTime,
  formatDatesDifference,
  formatBoolean,
  formatFromWei,
  formatFraction,
  formatMarketDescriptor,
  tokenPairSplit
}
