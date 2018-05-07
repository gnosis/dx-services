const POSITIONALS_BY_NAME = {
  'token-pair': {
    type: 'string',
    default: 'WETH-RDN',
    describe: 'The token pair of the auction'
  },

  'token-pairs': {
    type: 'string', // TODO: See how to make this a list :)
    default: 'WETH-RDN,WETH-OMG',
    describe: 'The token pair of the auction'
  },

  'token': {
    type: 'string',
    default: 'WETH',
    describe: 'Name of the token'
  },

  'auction-index': {
    type: 'integer',
    default: null,
    describe: 'Index of the auction'
  },

  'count': {
    type: 'number',
    default: 5,
    describe: 'The number of elements'
  },

  'amount': {
    type: 'float',
    describe: 'Amount to buy'
  },

  'account': {
    type: 'string',
    describe: 'Address were you send the tokens'
  },

  'period': {
    type: 'string',
    describe: 'Date period, i.e today, yesterday, week, last-week, current-week'
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

function tokenize (value) {
  if (!value) {
    return null
  }

  const tokenized = value.split(',')
  if (typeof tokenized === 'string') {
    return [ tokenized ]
  } else {
    return tokenized
  }
}

function toTokenPairs (tokenPairString) {
  const tokenPairsTokenized = tokenize(tokenPairString)

  return tokenPairsTokenized.map(tokenPairString => {
    const [ sellToken, buyToken ] = tokenPairString.split('-')
    return { sellToken, buyToken }
  })
}

module.exports = {
  getPositionalByName,
  tokenize,
  toTokenPairs
}
