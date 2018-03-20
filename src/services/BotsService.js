class BotsService {
  setBots (bots) {
    this._bots = bots
  }

  async getAbout () {
    // Return bot info
    const bots = await Promise.all(
      this._bots.map(async bot => {
        const botInfo = await bot.getInfo()
        return Object.assign({
          name: bot.name,
          startTime: bot.startTime
        }, botInfo)
      }))
    
    return { bots }
  }
}

module.exports = BotsService
