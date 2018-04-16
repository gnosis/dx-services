const SlackClient = require('../../../../src/helpers/SlackClient')

const slackClient = new SlackClient()
const _printChannels = require('./_printChannels')
const showEmptyChannels = false

slackClient
  .getChannels()
  .then(({ channels }) => {
    return channels.filter(({ num_members: numMembers }) => {
      return numMembers > 0 || showEmptyChannels
    })
  })
  .then(_printChannels)
  .catch(console.error)
