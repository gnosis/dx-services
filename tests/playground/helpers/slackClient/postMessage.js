const SlackClient = require('../../../../src/helpers/SlackClient')

// https://api.slack.com/docs/messages/builder
const slackClient = new SlackClient()
slackClient
  .postMessage({
    as_user: false,
    username: 'magnolio',
    channel: 'GA5J9F13J',
    text: 'Hi, this is Magnolio, how are you doing? :)'
  })
  .then(({ ts }) => {
    console.log('Message sent: ', ts)
  })
  .catch(console.error)
