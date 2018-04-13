const slackClient = require('../../../../src/helpers/slackClient')
const showEmptyChannels = false

slackClient
  .getChannels()
  .then(({ channels }) => {
    channels.forEach(({
      id,
      name,
      is_private: isPrivate,
      topic,
      purpose,
      num_members: numMembers
    }) => {
      if (numMembers > 0 || showEmptyChannels) {
        const publicOrPrivate = isPrivate ? 'Private' : 'Public'
        console.log(`\n${name} (${id}) - ${publicOrPrivate}`)
        if (topic.value) {
          console.log(`\t- Topic: ${topic.value}`)
        }
        if (purpose.value) {
          console.log(`\t- Purpose: ${purpose.value}`)
        }
        console.log(`\t- Members in the channel: ${numMembers}`)
      }
    })
  })
  .catch(console.error)
