const loggerNamespace = 'dx-service:ApiRunner'
const Logger = require('./helpers/Logger')
const logger = new Logger(loggerNamespace)

const getDxInfoService = require('./services/DxInfoService')
const getSlackRepo = require('./repositories/SlackRepo')

// Public Api
const getPublicApiServer = require('./web/publicApi/PublicApiServer')

class ApiRunner {
  constructor ({
    config
  }) {
    this.initialized = false
    this._config = config
  }

  async init () {
    const [ dxInfoService, slackRepo, publicApiServer ] =
    await Promise.all([
      getDxInfoService(),
      getSlackRepo(),
      getPublicApiServer()
    ])

    this._dxInfoService = dxInfoService
    this._slackRepo = slackRepo
    this._publicApiServer = publicApiServer
    this.initialized = true
  }

  async start () {
    if (!this.initialized) {
      // Init bots and API Server
      await this.init()
    }
    const version = await this._dxInfoService.getVersion()
    await this._notifyStart(version)

    // Run Api server
    await this._publicApiServer.start()

    logger.info('Public API Server %s ready!', version)
  }

  async stop () {
    const version = await this._dxInfoService.getVersion()
    await this._notifyStop(version)

    // Stop the API Server
    if (this._publicApiServer) {
      this._publicApiServer.stop()
    }
    logger.info('Public API Server is ready to shut down')
  }

  async _notifyStart (version) {
    const message = `Starting Public API Server v${version} in \
"${this._config.ENVIRONMENT}" environment`

    // Display some basic info
    logger.info(message)

    if (this._slackRepo.isEnabled()) {
      await this._slackRepo.postMessage({
        channel: this._config.SLACK_CHANNEL_OPERATIONS,
        text: message
      }).catch(error => {
        logger.error({
          msg: 'Error notifing API start to Slack: ' + error.toString(),
          error
        })
      })
    }
  }

  async _notifyStop (version) {
    const message = `Stopping Public API Server v${version} in \
"${this._config.ENVIRONMENT}" environment`

    // Display some basic info
    logger.info(message)

    if (this._slackRepo.isEnabled()) {
      await this._slackRepo.postMessage({
        channel: this._config.SLACK_CHANNEL_OPERATIONS,
        text: message
      }).catch(error => {
        logger.error({
          msg: 'Error notifing API stop to Slack: ' + error.toString(),
          error
        })
      })
    }
  }
}

module.exports = ApiRunner
