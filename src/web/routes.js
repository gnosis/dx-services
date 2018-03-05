const express = require('express')
const path = require('path')
// const debug = require('debug')('dx-services:web:api')

// TODO: Use config
const CONTEXT_PATH = ''

const mainPages = express.Router()
mainPages.use(CONTEXT_PATH, express.static(path.join(__dirname, 'static')))

module.exports = options => ({
  // Pages
  '/': mainPages,

  // Api
  '/api': require('./api/api-routes')(options)
})
