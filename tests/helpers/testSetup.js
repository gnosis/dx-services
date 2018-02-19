const instanceFactory = require('../../src/helpers/instanceFactory')
const BigNumber = require('bignumber.js')
const NUM_TEST_USERS = 1

const config = {
  AUCTION_REPO_IMPL: 'ethereum'
}

const stateInfoProps = ['auctionIndex', 'auctionStart']
const auctionProps = [
  'buyVolume',
  'sellVolume',
  'closingPrice',
  'isClosed',
  'isTheoreticalClosed'
]

// const balanceProps = ['token', 'balance']

async function getContracts ({ ethereumClient, auctionRepo }) {
  return {
    dx: auctionRepo._dx,
    priceOracle: auctionRepo._priceOracle,
    tokens: auctionRepo._tokens,
    // the following address are just for debuging porpouses
    dxMaster: auctionRepo._dxMaster
  }
}

async function getHelpers ({ ethereumClient, auctionRepo, ethereumRepo }, { dx, dxMaster, priceOracle, tokens }) {
  const address = await ethereumClient.getCoinbase()
  const accounts = await ethereumClient.getAccounts()
  const web3 = ethereumClient.getWeb3()
  const [ owner, user1, user2 ] = accounts

  const formatters = {
    closingPrice: fractionFormatter,
    sellVolume: formatFromWei,
    buyVolume: formatFromWei,
    balance: formatFromWei
  }

  // helpers
  async function buySell (operation, { from, buyToken, sellToken, amount }) {
    // buy
    const auctionIndex = await auctionRepo.getAuctionIndex({
      buyToken,
      sellToken
    })
    console.log(`Token:\n\t${sellToken}-${buyToken}. Auction: ${auctionIndex}`)
    console.log(`Auction:\n\t${auctionIndex}`)

    await printState('State before buy', { buyToken, sellToken })

    await auctionRepo[operation]({
      from,
      buyToken,
      sellToken,
      auctionIndex,
      amount: web3.toWei(amount, 'ether')
    })
    console.log(`Succesfull "${operation}" of ${amount} tokens. SellToken: ${sellToken}, BuyToken: ${buyToken} `)
    await printState('State after buy', { buyToken, sellToken })
  }

  async function setupTestCases () {
    console.log(`\n**********  Setup DX: Founding, and aproved tokens and Oracle  **********\n`)
    // Deposit 50ETH in the ETH Token
    // const [, ...users] = accounts
    const users = accounts.slice(1, 1 + NUM_TEST_USERS)
    const initialAmounts = [
      { token: 'ETH', amount: 15 },
      { token: 'GNO', amount: 5 },
      { token: 'OWL', amount: 6 },
      // { token: 'TUL', amount: 2 },
      { token: 'RDN', amount: 10 },
      { token: 'OMG', amount: 20 }
    ]
    const approveERC20Tokens = ['ETH', 'OWL', 'RDN', 'OMG']
    const depositERC20Tokens = approveERC20Tokens.concat(['GNO'])
    // const ethUsdPrice = 1100.0

    function getAmount (token) {
      const amount = initialAmounts
        .find(initialAmount => initialAmount.token === token)
        .amount
      if (!amount) {
        throw new Error('Initial amount is not declared for token ' + token)
      }

      return amount
    }

    // Aprove tokens
    console.log('\tAprove tokens:')
    await Promise.all(
      approveERC20Tokens.map(token => {
        return auctionRepo
          .approveToken({ token, from: owner })
          .then(() => console.log(`\t\t- The "owner" has approved the token "${token}"`))
      })
    )
    console.log('\t\t- All tokens has been approved')

    console.log('\n\tFounding DX:')
    const userSetupPromises = users.map(async userAddress => {
      const userId = users.indexOf(userAddress) + 1

      // The owner gives some tokens to the users
      await Promise.all(
        depositERC20Tokens
          // We don't need to give ETH to the users (they deposit it)
          .filter(t => t !== 'ETH')
          .map(token => {
            const amount = getAmount(token)

            return auctionRepo.transferERC20Token({
              from: owner,
              to: userAddress,
              token,
              amount: web3.toWei(amount, 'ether')
            }).then(() => {
              console.log('\t\t- "owner" gives "user%d" %d %s as a present', userId, amount, token)
            })
          })
      )

      // User deposits ETH
      const amountETH = getAmount('ETH')
      await auctionRepo.depositEther({
        from: userAddress,
        amount: web3.toWei(amountETH, 'ether')
      })
      console.log('\t\t- "user%d" deposits %d ETH into ETH token', userId, amountETH)

      // Deposit initial amounts
      await Promise.all(initialAmounts.map(({ token }) => {
        const amount = getAmount(token)

        const amountInWei = web3.toWei(amount, 'ether')
        return auctionRepo.approveERC20Token({
          from: userAddress,
          token,
          amount: amountInWei
        }).then(() => {
          console.log('\t\t- "user%d" aproves DX to take %d %s on his behalf', userId, amount, token)
        })
      }))

      await Promise.all(initialAmounts.map(({ token, amount }) => {
        const amountInWei = web3.toWei(amount, 'ether')
        // console.log('\t\t- "user%d" is about to deposits %d %s in the DX', userId, amount, token)
        return auctionRepo.deposit({
          from: userAddress,
          token,
          amount: amountInWei
        }).then(() => {
          console.log('\t\t- "user%d" deposits %d %s in the DX', userId, amount, token)
        })
      }))
    })

    // Do funding
    await Promise.all(userSetupPromises)
    console.log('\t\t- All users has deposited the %s tokens in the DX\n',
      depositERC20Tokens.join(', '))

    // I don't understand why we need this
    // TODO: Revview "testFunction" in DX
    /*
    console.log('\n\tFounding DX:')
    const priceFeedSource = await priceOracle.priceFeedSource.call()
    await priceFeed.post(
      web3.toWei(ethUsdPrice),
      1516168838 * 2,
      priceFeedSource,
      { from: owner }
    )
    */

    console.log('\n**************************************\n\n')
  }

  async function printTime (message) {
    const time = await ethereumClient.geLastBlockTime()
    console.log(message + ':\t', time.toUTCString())
  }

  async function printState (message, { sellToken, buyToken }) {
    const isSellTokenApproved = await auctionRepo.isApprovedToken({ token: sellToken })
    const isBuyTokenApproved = await auctionRepo.isApprovedToken({ token: buyToken })

    const stateInfo = await auctionRepo.getStateInfo({ sellToken, buyToken })
    const state = await auctionRepo.getState({ sellToken, buyToken })
    const isApprovedMarket = await auctionRepo.isApprovedMarket({ tokenA: sellToken, tokenB: buyToken })
    const auctionIndex = await auctionRepo.getAuctionIndex({ buyToken, sellToken })    

    console.log(`\n**********  ${message}  **********\n`)
    console.log(`\tToken pair: ${sellToken}-${buyToken}`)
    console.log('\n\tIs an approved market? %s', isApprovedMarket ? 'Yes' : 'No')
    console.log(`\tState: ${state}`)

    console.log(`\n\tAre tokens Approved?`)
    console.log('\t\t- %s: %s', sellToken, printBoolean(isSellTokenApproved))
    console.log('\t\t- %s: %s', buyToken, printBoolean(isBuyTokenApproved))

    console.log('\n\tState info:')
    printProps('\t\t', stateInfoProps, stateInfo)

    async function printAuction (auction, tokenA, tokenB) {
      console.log(`\n\tAuction ${tokenA}-${tokenB}: `)
      printProps('\t\t', auctionProps, auction, formatters)
      const price = await auctionRepo.getPrice({ sellToken: tokenA, buyToken: tokenB, auctionIndex })
      if (sellToken === 'ETH') {
        const ethUsdPrice = await auctionRepo.getEthUsdPrice()
        const sellVolumeInUsd = ethUsdPrice * formatFromWei(auction.sellVolume)
        console.log(`\t\tSell Volumen in USD: $%d`, sellVolumeInUsd.toFixed(2))
      }
      console.log(`\t\tCurrent Price:`, fractionFormatter(price))
      if (price) {
        const buyVolumesInSellTokens = price.denominator.times(auction.buyVolume).div(price.numerator)
        const boughtPercentage = 100 - 100 * (auction.sellVolume - buyVolumesInSellTokens) / auction.sellVolume
  
        console.log(`\t\tBuy volume (in sell tokens):`, formatFromWei(buyVolumesInSellTokens.toNumber()))
        console.log(`\t\tBought percentage: %d %`, boughtPercentage.toFixed(4))
      }
    }

    if (stateInfo.auction) {
      await printAuction(stateInfo.auction, sellToken, buyToken)
    }

    if (stateInfo.auctionOpp) {
      await printAuction(stateInfo.auctionOpp, buyToken, sellToken)
    }
    console.log('\n**************************************\n\n')
  }

  async function printAddresses () {
    console.log(`\n**********  Addresses  **********\n`)
    // console.log('\n\tUsers:')
    const users = {
      /*
      'Owner': owner,
      'User 1': user1,
      'User 2': user2
      */
      'owner': owner,
      'user1': user1,
      'user2': user2
    }
    Object.keys(users).forEach(name => {
      // console.log('\t\t-%s: %s', name, users[name])
      console.log("var %s = '%s'", name, users[name])
    })

    // Print token addresses
    // console.log('\n\tToken Addresses:')
    const tokens = await auctionRepo.getTokens()
    await Promise.all(
      tokens.map(async token => {
        const tokenAddress = await auctionRepo.getTokenAddress({ token })
        // console.log('var %s: %s', token.toLowerCase(), tokenAddress)
        console.log("var %sAddress = '%s'", token.toLowerCase(), tokenAddress)
      })
    )

    // console.log('\n\tContract Addresses:')
    const contracts = {
      /*
      'DX (proxy)': dx.address,
      'DX (master)': dxMaster.address,
      'Price Oracle': priceOracle.address
      */
      'dxAddress': dx.address,
      'dxMasterAddress': dxMaster.address,
      'priceOracleAddress': priceOracle.address
    }
    Object.keys(contracts).forEach(name => {
      // console.log('\t\t- %s: \t%s', name, contracts[name])
      console.log("var %s = '%s'", name, contracts[name])
    })

    console.log(`
var formatFromWei = n => web3.fromWei(n, 'ether').toNumber()

var dx = DutchExchange.at(dxAddress)
var dxMaster = DutchExchange.at(dxMasterAddress)
var priceOracle = PriceOracleInterface.at(priceOracleAddress)

var eth = EtherToken.at(ethAddress)
var rdn = Token.at(rdnAddress)
var omg = Token.at(omgAddress)


dx.sellVolumesCurrent(ethAddress, rdnAddress).then(formatFromWei)
eth.balanceOf(user1).then(formatFromWei)
eth.allowance(user1, dxAddress).then(formatFromWei)
dx.deposit(ethAddress, web3.toWei(1, 'ether'), { from: user1 })
dx.balances(ethAddress, user1).then(formatFromWei)
priceOracle.getUSDETHPrice().then(formatFromWei)
      `)

    console.log('\n**************************************\n\n')
  }

  async function printBalances ({
    accountName = 'owner',
    account = address,
    verbose = true
  }) {
    console.log(`\n**********  Balance for ${accountName}  **********\n`)
    const balanceETH = await ethereumRepo.balanceOf({ account })
    console.log('\tACCOUNT: %s', account)
    console.log('\tBALANCE: %d ETH', formatFromWei(balanceETH))

    const tokens = await auctionRepo.getTokens()
    const balances = await Promise.all(
      tokens.map(async token => {
        const tokenAddress = await auctionRepo.getTokenAddress({ token })

        return Promise
          .all([
            // get token balance
            ethereumRepo.tokenBalanceOf({ tokenAddress, account }),
            ethereumRepo.tokenAllowance({
              tokenAddress,
              owner: account,
              spender: dx.address
            }),
            ethereumRepo.tokenAllowance({
              tokenAddress,
              owner: account,
              spender: dxMaster.address
            }),
            ethereumRepo.tokenTotalSupply({ tokenAddress }),
            // get token balance in DX
            auctionRepo.getBalance({ token, address: account })
          ])
          .then(([ amount, allowance, allowanceMaster, totalSupply, amountInDx ]) => {
            return {
              tokenAddress,
              token,
              amount,
              allowance,
              allowanceMaster,
              totalSupply,
              amountInDx
            }
          })
      }))

    balances.forEach(balance => {
      console.log('\n\tBalances %s:', balance.token)
      console.log('\t\t- Balance in DX: ' + formatFromWei(balance.amountInDx))
      console.log('\t\t- Balance of user: ' + formatFromWei(balance.amount))

      if (verbose) {
        console.log('\t\t- Approved for DX: ' + formatFromWei(balance.allowance))
        // console.log('\t\t- Alowance DX (master): ' + formatFromWei(balance.allowanceMaster))
        console.log('\t\t- Token Supply: ' + formatFromWei(balance.totalSupply))
        // console.log('\t\t- Token address: ' + balance.tokenAddress)
      }
    })
    console.log('\n**************************************\n\n')
  }

  function formatFromWei (wei) {
    return web3.fromWei(wei, 'ether') // .toNumber()
  }

  async function printOraclePrice (message, { token }) {
    const isApproved = await auctionRepo.isApprovedToken({ token })

    if (isApproved) {
      const hasPrice = await auctionRepo.hasPrice({ token })

      if (hasPrice) {
        const priceToken = await auctionRepo.getPriceOracle({ token })
        console.log('%s%s: %d ETH/%s',
          message, token, fractionFormatter(priceToken), token)
      } else {
        console.log(`\t\t- %s: The token has no price because the market %s-ETH\
 doesn't exist yet`, token, token)
      }
    } else {
      console.log('\t\t- %s: The token is not approved yet, so it cannot have price', token)
    }
  }

  async function addTokenPair ({ accountName, from, tokenA, tokenB, tokenAFunding, tokenBFunding, initialClosingPrice }) {
    const tokenABalance = await auctionRepo.getBalance({
      token: tokenA,
      address: from
    })
    const tokenBBalance = await auctionRepo.getBalance({
      token: tokenB,
      address: from
    })
    // const ethUsdPrice = await auctionRepo.getBalance({ token: tokenB })

    console.log(`\n**********  "${accountName}" ads a new token pair  **********\n`)
    console.log('\tMarket to add:')
    console.log('\t\t- Market: %s-%s', tokenA, tokenB)
    console.log('\t\t- %d %s. The user has a balance of %d %s',
      formatFromWei(tokenAFunding), tokenA, formatFromWei(tokenABalance), tokenA)
    console.log('\t\t- %d %s. The user has a balance of %d %s',
      formatFromWei(tokenBFunding), tokenB, formatFromWei(tokenBBalance), tokenB)
    console.log('\t\t- Initial price: %d', fractionFormatter(initialClosingPrice))
    console.log('\t\t- From: %s (%s)', accountName, from)

    console.log('\n\tPrice Oracle:')
    await printOraclePrice('\t\t- ', { token: tokenA })
    await printOraclePrice('\t\t- ', { token: tokenB })
    console.log()

    const result = await auctionRepo.addTokenPair({
      from,
      tokenA,
      tokenAFunding,
      tokenB,
      tokenBFunding,
      initialClosingPrice
    })
    console.log('\n\tResult:')
    console.log('\t\t- Successfully added the token pair. Transaction : %s', result)

    console.log('\n**************************************\n\n')

    // return result
  }

  async function deposit ({ account, token, amount }) {
    console.log(`\n**********  Deposit ${token} for ${account}  **********\n`)
    let balance = await auctionRepo.getBalance({
      token,
      address: account
    })

    console.log('\n\tPrevious balance:')
    console.log('\t\t- %s: %d', token, formatFromWei(balance))

    console.log('\n\tAmount to deposit:')
    console.log('\t\t- %s: %d', token, amount)

    // do the deposit
    await auctionRepo.deposit({
      token,
      amount: web3.toWei(amount, 'ether'),
      from: account
    })

    console.log('\n\tNew balance:')
    balance = await auctionRepo.getBalance({ token: token, address: account })
    console.log('\t\t- %s: %d', token, formatFromWei(balance))

    console.log('\n**************************************\n\n')
  }

  async function addTokens () {
    return addTokenPair({
      accountName: 'user1',
      from: user1,
      tokenA: 'RDN',
      tokenAFunding: web3.toWei(0, 'ether'),
      tokenB: 'ETH',
      tokenBFunding: web3.toWei(13.123, 'ether'),
      initialClosingPrice: {
        numerator: 4079,
        denominator: 1000000
      }
    })

    /*
    await addTokenPair({
      tokenA: 'OMG',
      tokenAFunding: 0,
      tokenB: 'ETH',
      tokenBFunding: 20.123,
      initialClosingPrice: {
        numerator: 1279820,
        denominator: 100000000
      }
    })
    */
  }

  return {
    web3,
    address,
    owner,
    user1,
    user2,
    accounts,

    // debug utils
    printProps,
    printTime,
    printState,
    printBalances,
    printAddresses,
    fractionFormatter,

    // interact with DX
    setupTestCases,
    addTokens,
    buySell,
    deposit
  }
}
function printProps (prefix, props, object, formatters) {
  if (object) {
    props.forEach(prop => {
      let value = object[prop]
      if (formatters && formatters[prop]) {
        value = formatters[prop](value)
      }

      console.log(`${prefix}${prop}: ${value}`)
    })
  } else {
    console.log(`${prefix}${object}`)
  }
}

function fractionFormatter (fraction) {
  if (fraction === null) {
    return null
  } else {
    const fractionBigNumber = {
      numerator: new BigNumber(fraction.numerator),
      denominator: new BigNumber(fraction.denominator)
    }

    return fractionBigNumber
      .numerator
      .div(fractionBigNumber.denominator)
      .toNumber()
  }
}
/*
function fractionFormatter ({ numerator, denominator }) {
  const fraction = {
    numerator: new BigNumber(numerator),
    denominator: new BigNumber(denominator)
  }

  if (fraction.numerator.isZero() && fraction.denominator.isZero()) {
    return 0
  } else {
    return fraction
      .numerator
      .div(fraction.denominator)
      .toNumber()
  }
}
*/

function printBoolean (flag) {
  return flag ? 'Yes' : 'No'
}

/*
function weiToEth (wei) {
  return new BigNumber(wei).div(10 ** 18)
}
*/

function testSetup () {
  return instanceFactory({ test: true, config })
    .then(async instances => {
      const contracts = await getContracts(instances)
      const helpers = await getHelpers(instances, contracts)
      return Object.assign({}, contracts, helpers, instances)
    })
}

module.exports = testSetup
