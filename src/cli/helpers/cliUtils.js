const POSITIONALS_BY_NAME = {
  'token-pair': {
    type: 'string',
    default: 'ETH-RDN',
    describe: 'The token pair of the auction'
  },

  'count': {
    type: 'number',
    default: 5,
    describe: 'The token pair of the auction'
  }
}

function getPositionalByName (name, yargs) {
  const positionalConfig = POSITIONALS_BY_NAME[name]
  if (positionalConfig) {
    yargs.positional(name, positionalConfig)
  } else {
    throw new Error("There's no positional argument named: " + name)
  }
}

module.exports = {
  getPositionalByName
}
