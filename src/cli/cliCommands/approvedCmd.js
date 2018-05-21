const cliUtils = require('../helpers/cliUtils')

function registerCommand ({ cli, instances, logger }) {
  cli.command(
    'approved <token>',
    'Check if a given token is approved',
    yargs => {
      cliUtils.addPositionalByName('token', yargs)
    }, async function (argv) {
      const { token } = argv
      const {
        dxInfoService
      } = instances

      // Get auction index
      const approved = await dxInfoService.isApprovedToken({ token })
      logger.info('Is token %s approved? %s', token, approved ? 'Yes' : 'No')
    })
}

module.exports = registerCommand
