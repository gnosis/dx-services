function registerCommand ({ cli, instances, logger }) {
  cli.command('hello [name]', 'welcome ter yargs!', yargs => {
    yargs.positional('name', {
      type: 'string',
      default: 'Cambi',
      describe: 'the name to say hello to'
    })
  }, function (argv) {
    logger.debug('hello', argv.name, 'welcome to yargs!')
  })
}

module.exports = registerCommand
