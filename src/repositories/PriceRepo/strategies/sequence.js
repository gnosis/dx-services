const loggerNamespace = 'dx-service:repositories:priceRepo:strategies:sequence'
const AuctionLogger = require('../../../helpers/AuctionLogger')
const auctionLogger = new AuctionLogger(loggerNamespace)

const priceRepos = {}

function _capitalizeFirstLetter (string) {
  return string.charAt(0).toUpperCase() + string.slice(1)
}

function _getPriceRepo (feedName) {
  let priceRepo = priceRepos[feedName]
  if (!priceRepo) {
    const PriceRepo = require('../feeds/PriceRepo' + _capitalizeFirstLetter(feedName))
    priceRepo = new PriceRepo({})
    priceRepos[feedName] = priceRepo
  }
  return priceRepo
}

async function _doGetPrice ({ tokenA, tokenB }, feeds) {
  const [ bestFeed, ...remainingFeeds ] = feeds

  return _getPriceRepo(bestFeed)
    .getPrice({ tokenA, tokenB })
    .catch(error => {
      const msg = 'Error getting the price from "%s", remaining feeds: %s'
      const params = [ bestFeed, remainingFeeds.join(',') ]

      auctionLogger.error({
        sellToken: tokenA,
        buyToken: tokenB,
        msg,
        params       
      })
      auctionLogger.warn({
        sellToken: tokenA,
        buyToken: tokenB,
        msg,
        params,
        error
      })

      if (remainingFeeds.length > 0) {
        return _doGetPrice({ tokenA, tokenB }, remainingFeeds)
      } else {
        throw new Error('Not more feeds avaliable. All of the price feeds have failed')
      }
    })
}

function getPrice ({ tokenA, tokenB }, { feeds }) {
  return _doGetPrice({ tokenA, tokenB }, feeds)
}

module.exports = {
  getPrice
}
