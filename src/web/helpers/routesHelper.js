function tokenPairSplit (tokenPair) {
  let splittedPair = tokenPair.toUpperCase().split('-')
  if (splittedPair.length === 2) {
    const [sellToken, buyToken] = splittedPair
    return {
      sellToken,
      buyToken
    }
  } else {
    const error = new Error('Invalid token pair format. Valid format is <sellToken>-<buyToken>')
    error.type = 'INVALID_TOKEN_FORMAT'
    error.status = 412
    throw error
  }
}

module.exports = {
  tokenPairSplit
}
