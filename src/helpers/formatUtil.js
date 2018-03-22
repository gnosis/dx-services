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

module.exports = {
  formatDateTime,
  formatDatesDifference,
  formatBoolean,
  formatFromWei,
  formatFraction
}
