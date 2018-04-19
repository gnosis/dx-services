const moment = require('moment')

function addPeriod (date, amount, period) {
  return moment(date)
    .add(amount, period)
    .toDate()
}

function toStartOf (date, period) {
  return moment(date).startOf(period)
}

function toEndOf (date, period) {
  return moment(date).endOf(period)
}

module.exports = {
  addPeriod,
  toStartOf,
  toEndOf
}
