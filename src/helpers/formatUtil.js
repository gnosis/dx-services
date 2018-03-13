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

module.exports = {
  formatDateTime,
  formatDatesDifference,
  formatBoolean
}
