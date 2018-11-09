const conf = require('../../../conf')

let priceRepo

module.exports = async () => {
  if (!priceRepo) {
    const {
      Factory: PriceRepo,
      factoryConf: priceRepoConf
    } = conf.getFactory('PRICE_REPO')

    priceRepo = new PriceRepo(priceRepoConf)
  }
  return priceRepo
}
