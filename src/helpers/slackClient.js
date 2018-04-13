const assert = require('assert')
const { WebClient } = require('@slack/client')

// An access token (from your Slack app or custom integration - xoxp, xoxb, or xoxa)
const token = process.env.SLACK_TOKEN

let web
if (token) {
  web = new WebClient(token)
}

// This argument can be a channel ID, a DM ID, a MPDM ID, or a group ID
// const conversationId = 'C1232456'

function postMessage ({ channel, text, attachments, file }) {
  _assertEnabled()

  // See: https://api.slack.com/docs/messages/builder
  return web.chat
    .postMessage({
      channel,
      text,
      attachments,
      file
    })
}

function uploadFile ({ fileName, file }) {
  _assertEnabled()

  return web.files.upload({
    filename: fileName,
    file
  })
}

function uploadContentFile ({ fileName, content }) {
  _assertEnabled()

  return web.files.upload({
    filename: fileName,
    content
  })
}

// See: https://api.slack.com/methods/channels.list
function getChannels () {
  _assertEnabled()
  return web.channels.list()
}

function isEnabled () {
  return web !== undefined
}

function _assertEnabled () {
  assert(isEnabled(), 'Slack is disabled. Enable it using SLACK_TOKEN environment var')
}

module.exports = {
  getChannels,
  postMessage,
  uploadFile,
  uploadContentFile,
  isEnabled
}
