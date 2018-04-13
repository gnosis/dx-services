const slackClient = require('../../../../src/helpers/slackClient')
const _printChannels = require('./_printChannels')
const showEmptyChannels = false

slackClient
  .getPrivateChannels()
  .then(({ groups }) => {
    return groups.filter(({ num_members: numMembers }) => {
      return numMembers > 0 || showEmptyChannels
    })
  })
  .then(_printChannels)
  .catch(console.error)
