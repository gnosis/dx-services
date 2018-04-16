const SlackClient = require('../../../../src/helpers/SlackClient')

// https://api.slack.com/docs/messages/builder
const fs = require('fs')
// http://slackapi.github.io/node-slack-sdk/web_api
/* eslint quotes: 0 */
const message = {
  "text": "Check out what the bot's been doing lately",
  "attachments": [
    {
      "title": "New report avaliable",
      "color": "good",
      "text": "There's a new report for the last auctions of Dutch X",
      "fields": [
        {
          "title": "From:",
          "value": "16/04/18",
          "short": false
        }, {
          "title": "To:",
          "value": "23/04/18",
          "short": false
        }
      ],
      "footer": "Dutch X Bots - v1.0",
      "ts": 123456789
    }
  ]
}

message.channel = 'GA5J9F13J'
const slackClient = new SlackClient()

// const file = fs.createReadStream(`./test-file.csv`)
// slackClient
//   .uploadFile({
//     fileName: 'Last-auctions-report.csv',
//     file
//   })
//   .then(({ file }) => {
//     console.log('File uploaded: ', file.id)

//     return slackClient.shareFile({ fileId: file.id })
//   })
//   .then(({ file }) => {
//     console.log('File download Url: ', file.url_download)
//   })
//   .catch(console.error)

const file = fs.createReadStream(`./test-file.csv`)
slackClient
  .uploadFile({
    fileName: 'Last-auctions-report.csv',
    file,
    channels: 'GA5J9F13J'
  })
  .then(({ file }) => {
    console.log('File uploaded: ', file.id)
    console.log('Url private: ', file.url_private)

    message.attachments[0].fields.push({
      "title": "File:",
      "value": file.url_private,
      "short": false
    })

    return slackClient.postMessage(message)
  })
  .then(({ ts }) => {
    console.log('Message sent: ', ts)
  })
  .catch(console.error)
