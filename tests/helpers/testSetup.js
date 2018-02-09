const instanceFactory = require('../../src/helpers/instanceFactory')
const BigNumber = require('bignumber.js')

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

function getContracts ({ ethereumClient, auctionRepo }) {
  return {
    dx: auctionRepo._dx,
    priceOracle: auctionRepo._priceOracle,
    tokens: auctionRepo._tokens,
    // the following address are just for debuging porpouses
    dxMaster: auctionRepo._dxMaster
  }
}

function getHelpers ({ ethereumClient, auctionRepo, ethereumRepo }, { dx, dxMaster, priceOracle, tokens }) {
  const address = ethereumClient.getCoinbase()
  const web3 = ethereumClient.getWeb3()
  const accounts = web3.eth.accounts
  const [ owner, user1, user2 ] = accounts

  // helpers
  async function buySell (operation, { buyToken, sellToken, amount }) {
    // buy
    const auctionIndex = await auctionRepo.getAuctionIndex({
      buyToken,
      sellToken
    })
    console.log(`Token:\n\t${sellToken}-${buyToken}. Auction: ${auctionIndex}`)
    console.log(`Auction:\n\t${auctionIndex}`)
    await printState('State before buy', { buyToken, sellToken })

    await auctionRepo[operation]({
      address,
      buyToken,
      sellToken,
      auctionIndex,
      amount
    })
    console.log(`Succesfull "${operation}" of ${amount} tokens. SellToken: ${sellToken}, BuyToken: ${buyToken} `)
    await printState('State after buy', { buyToken, sellToken })
  }

  async function setupTestCases () {
    console.log(`\n**********  Setup DX: Founding, and aproved tokens  **********\n`)
    // Deposit 50ETH in the ETH Token
    const [, ...users] = accounts
    const amountETH = 50
    const amountGNO = 50
    const initialAmounts = [
      { token: 'ETH', amount: amountETH },
      { token: 'GNO', amount: amountGNO }
    ]
    const approveERC20Tokens = ['RDN', 'OMG']

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

      // The owner gives some GNO to the users
      await auctionRepo.transferERC20Token({
        from: owner,
        to: userAddress,
        token: 'GNO',
        amount: web3.toWei(amountGNO, 'ether')
      })
      console.log('\t\t- "owner" gives "user%d" %d %s as a present', userId, amountGNO, 'GNO')

      // User deposits ETH
      await auctionRepo.depositEther({
        from: userAddress,
        amount: web3.toWei(amountETH, 'ether')
      })
      console.log('\t\t- "user%d" deposits %d ETH into ETH token', userId, amountETH)

      // Deposit initial amounts
      await Promise.all(initialAmounts.map(({ token, amount }) => {
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
        /*
        if (token === 'GNO') {
          return Promise.resolve()
        }
        */
        const amountInWei = web3.toWei(amount, 'ether')
        console.log('\t\t- "user%d" is about to deposits %d %s in the DX', userId, amount, token)
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
    console.log('\t\t- All users has deposited the ETH and GNO tokens in the DX\n')

    console.log('\n**************************************\n\n')
  }

  async function printTime (message) {
    const time = await ethereumClient.geLastBlockTime()
    console.log(message + ':\t', time.toUTCString())
  }

  async function printState (message, { sellToken, buyToken }) {
    const isSellTokenApproved = await auctionRepo.isApprovedToken({ token: sellToken })
    const isBuyTokenApproved = await auctionRepo.isApprovedToken({ token: buyToken })
    console.log(`\n**********  ${message}  **********\n`)

    if (!isSellTokenApproved || !isBuyTokenApproved) {
      console.log(`\tState: At least one of the tokens is not yet approved`)
      console.log('\n\tState info:')
      console.log('\n\t\tIs %s approved? %s', sellToken, printBoolean(isSellTokenApproved))
      console.log('\n\t\tIs %s approved? %s', buyToken, printBoolean(isBuyTokenApproved))
    } else {
      const state = await auctionRepo.getState({ sellToken, buyToken })
      const stateInfo = await auctionRepo.getStateInfo({ sellToken, buyToken })

      console.log(`\tState: ${state}`)

      console.log('\n\tState info:')
      printProps('\t\t', stateInfoProps, stateInfo)

      console.log(`\n\tAuction ${sellToken}-${buyToken}:`)
      printProps('\t\t', auctionProps, stateInfo.auction, formatters)

      console.log(`\n\tAuction ${buyToken}-${sellToken}:`)
      printProps('\t\t', auctionProps, stateInfo.auctionOpp, formatters)
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
var priceOracleAddress = PriceOracleInterface.at(priceOracleAddress)

var eth = EtherToken.at(ethAddress)
var rdn = Token.at(rdnAddress)
var omg = Token.at(omgAddress)


eth.balanceOf(user1).then(formatFromWei)
eth.allowance(user1, dxAddress).then(formatFromWei)
dx.deposit(ethAddress, web3.toWei(1, 'ether'), { from: user1 })
dx.balances(ethAddress, user1).then(formatFromWei)

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
      console.log('\t\t- Balance of user: ' + formatFromWei(balance.amount))
      if (verbose) {
        console.log('\t\t- Approved for DX: ' + formatFromWei(balance.allowance))
        // console.log('\t\t- Alowance DX (master): ' + formatFromWei(balance.allowanceMaster))
        console.log('\t\t- Balance in DX: ' + formatFromWei(balance.amountInDx))
        console.log('\t\t- Token Supply: ' + formatFromWei(balance.totalSupply))
        // console.log('\t\t- Token address: ' + balance.tokenAddress)
      }
    })
    console.log('\n**************************************\n\n')
  }

  function formatFromWei (wei) {
    return web3.fromWei(wei, 'ether').toNumber()
  }

  async function printOraclePrice (message, { token }) {
    const isApproved = await auctionRepo.isApprovedToken({ token })
    if (isApproved) {
      const priceToken = await auctionRepo.getPriceOracle({ token })
      console.log('%s%s: %d ETH/%s',
        message, token, fractionFormatter(token, priceToken), token)
    } else {
      console.log('\t\t- %s: No oracle price yet (not approved token)', token)
    }
  }

  async function addTokenPair ({ address, tokenA, tokenB, tokenAFunding, tokenBFunding, initialClosingPrice }) {
    const tokenABalance = await auctionRepo.getBalance({ token: tokenA, address })
    const tokenBBalance = await auctionRepo.getBalance({ token: tokenB, address })
    // const ethUsdPrice = await auctionRepo.getBalance({ token: tokenB })

    console.log(`\n**********  Add new token pair for: ${tokenA}-${tokenB}  **********\n`)
    console.log('\tMarket:')
    console.log('\t\t- Account: %s', address)
    console.log('\t\t- %d %s. The user has %d %s',
      tokenAFunding, tokenA, tokenABalance, tokenA)
    console.log('\t\t- %d %s. The user has %d %s',
      tokenBFunding, tokenB, tokenBBalance, tokenB)
    console.log('\t\t- Initial price: %d', fractionFormatter(initialClosingPrice))

    console.log('\n\tPrice Oracle:')
    await printOraclePrice('\t\t- ', { token: tokenA })
    await printOraclePrice('\t\t- ', { token: tokenB })
    console.log()

    const result = await auctionRepo.addTokenPair({
      address,
      tokenA,
      tokenAFunding,
      tokenB,
      tokenBFunding,
      initialClosingPrice
    })
    console.log('\n\tResult:')
    console.log('\t\t- TX: %s', result)

    console.log('\n**************************************\n\n')

    return result
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
      address,
      tokenA: 'RDN',
      tokenAFunding: 0,
      tokenB: 'ETH',
      tokenBFunding: 15.123,
      initialClosingPrice: {
        numerator: new BigNumber(330027),
        denominator: new BigNumber(100000000)
      }
    })

    /*
    await addTokenPair({
      address,
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
  props.forEach(prop => {
    let value = object[prop]
    if (formatters && formatters[prop]) {
      value = formatters[prop](value)
    }

    console.log(`${prefix}${prop}: ${value}`)
  })
}

function fractionFormatter (fraction) {
  if (fraction.numerator.isZero() && fraction.denominator.isZero()) {
    return null // fraction.numerator.toNumber()
  } else {
    return fraction
      .numerator
      .div(fraction.denominator)
      .toNumber()
  }
}

function numberFormatter (number) {
  return -1
}

function printBoolean (flag) {
  return flag ? 'Yes' : 'No'
}

/*
function weiToEth (wei) {
  return new BigNumber(wei).div(10 ** 18)
}
*/

const formatters = {
  closingPrice: fractionFormatter,
  balance: numberFormatter
}

function testSetup () {
  return instanceFactory({ test: true, config })
    .then(instances => {
      const contracts = getContracts(instances)
      const helpers = getHelpers(instances, contracts)
      return Object.assign({}, contracts, helpers, instances)
    })
}

module.exports = testSetup
