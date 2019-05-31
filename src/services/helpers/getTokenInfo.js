async function getTokenInfo ({
  auctionRepo,
  ethereumRepo,
  token
}) {
  const tokenAddress = await auctionRepo.getTokenAddress({ token })

  return ethereumRepo.tokenGetInfo({ tokenAddress })
}

module.exports = getTokenInfo
