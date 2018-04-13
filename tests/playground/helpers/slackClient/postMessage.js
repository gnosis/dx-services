const slackClient = require('../../../../src/helpers/slackClient')

slackClient
  .postMessage({
    channel: 'GA5J9F13J',
    text: 'Hi, this is Magnolio, how are you doing? :)'
  })
  .then(({ ts }) => {
    console.log('Message sent: ', ts)
  })
  .catch(console.error)