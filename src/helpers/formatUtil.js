const numberUtil = require('./numberUtil')
const moment = require('moment')

const DATE_FORMAT = 'D/MM/YY'
const DATE_FORMAT_FOR_PARSING = 'D/MM/YYYY' // Accepts 2 and 4 digits years
const TIME_FORMAT = 'H:mm'
const DATE_TIME_FORMAT = DATE_FORMAT + ' ' + TIME_FORMAT

function formatDateTime (date) {
  return date ? moment(date).format(DATE_TIME_FORMAT) : null
}

function formatDate (date) {
  return date ? moment(date).format(DATE_FORMAT) : null
}

function parseDate (dateStr) {
  return _parseDate(dateStr, DATE_FORMAT_FOR_PARSING, 'The required format is ' +
    DATE_FORMAT + '. Example: 15-01-2018')
}

function parseDateTime (dateStr) {
  return _parseDate(dateStr, DATE_TIME_FORMAT, 'The required format is ' + 
    DATE_TIME_FORMAT + '. Example: 15-01-2018 16:35')
}

function parseDateIso (dateStr, errorMessage) {
  return _parseDate(dateStr, null, 'Use a valid ISO 8601 format. Example: 2013-02-08')
}

function formatDatesDifference (date1, date2) {
  return moment.duration(moment(date1).diff(moment(date2))).humanize()
}

function formatDateFromNow (date) {
  return moment(date).fromNow()
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

function _parseDate (dateStr, format, errorMessage) {
  const date = format ? moment(dateStr, format) : moment(dateStr)

  if (!date.isValid()) {
    const error = new Error('Invalid date format' + errorMessage)
    error.data = {
      date: dateStr
    }
    error.type = 'DATE_FORMAT'
    error.status = 412

    throw error
  } else {
    return date.toDate()
  }
}

module.exports = {
  tokenPairSplit
}

module.exports = {
  formatDateTime,
  formatDate,
  formatDatesDifference,
  formatDateFromNow,
  formatBoolean,
  parseDate,
  parseDateTime,
  parseDateIso,
  formatFromWei,
  formatFraction,
  formatMarketDescriptor,
  tokenPairSplit
}
