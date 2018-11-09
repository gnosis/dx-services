const SlackRepo = require('./SlackRepo')

module.exports = async () => {
  return new SlackRepo()
}
