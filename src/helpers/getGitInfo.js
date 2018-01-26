var git = require('git-rev-sync')

module.exports = function () {
  return {
    short: git.short(),
    long: git.long(),
    branch: git.branch(),
    tag: git.tag()
  }
}
