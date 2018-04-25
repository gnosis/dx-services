function getBotAddress (ethereumClient) {
  const environment = process.env.NODE_ENV
  return ethereumClient
    .getAccounts()
    .then(accounts => {
      if (environment === 'local' && accounts.length > 1) {
        // In LOCAL, for testing we use:
        //  * the account 0 for the owner
        //  * the account 1 for the bot
        return accounts[1]
      } else if (accounts.length > 0) {
        // In DEV,PRE and PRO we use the account 0 for the bot
        return accounts[0]
      } else {
        throw new Error("The ethereumClient doesn't have the bot account configured")
      }
    })
}

module.exports = getBotAddress
