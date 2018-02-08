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
    dx_address_original: auctionRepo._dx_address_original,
    dx_address_proxy: auctionRepo._dx_address_proxy
  }
}

function getHelpers ({ ethereumClient, auctionRepo, ethereumRepo }, { dx, priceOracle, tokens, dx_address_original, dx_address_proxy }) {
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
    // Deposit 50ETH in the ETH Token
    const [, ...users] = accounts
    const amountETH = 50
    return Promise.all(
      users.map(userAddress => {
        return auctionRepo
          .depositEther({
            address: userAddress,
            amount: web3.toWei(amountETH, 'ether')
          })
          .then(() => {
            console.log('User %s deposits %d ETH into ETH token', userAddress, amountETH)
          })
      })
    ).then(() => console.log('All users has deposited the ETH tokens'))
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
    // Print token addresses
    console.log('\tToken Addresses:')
    const tokens = await auctionRepo.getTokens()
    await Promise.all(
      tokens.map(async token => {
        const tokenAddress = await auctionRepo.getTokenAddress({ token })
        console.log('\t\t- %s: %s', token, tokenAddress)
      })
    )

    console.log('\n\tContract Addresses:')
    const contracts = {
      'DX (actual)': dx.address,
      'DX (proxy)': dx_address_proxy,
      'DX (master)': dx_address_original,
      'Price Oracle': priceOracle.address
    }
    Object.keys(contracts).forEach(name => {
      console.log('\t\t- %s: \t%s', name, contracts[name])
    })

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
    console.log('\tBALANCE: %d ETH', weiToEth(balanceETH))

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
            ethereumRepo.tokenTotalSupply({ tokenAddress }),
            // get token balance in DX
            auctionRepo.getBalance({ token, address: account })
          ])
          .then(([ amount, allowance, totalSupply, amountInDx ]) => {
            return {
              tokenAddress,
              token,
              amount,
              allowance,
              totalSupply,
              amountInDx
            }
          })
      }))

    balances.forEach(balance => {
      console.log('\n\tBalances %s (in 10e18):', balance.token)
      console.log('\t\t- Balance: ' + weiToEth(balance.amount))
      if (verbose) {
        console.log('\t\t- Alowance DX: ' + weiToEth(balance.allowance))
        console.log('\t\t- Amount DX: ' + weiToEth(balance.amountInDx))
        console.log('\t\t- Total Suply: ' + weiToEth(balance.totalSupply))
        console.log('\t\t- Token address: ' + balance.tokenAddress)
      }
    })
    console.log('\n**************************************\n\n')
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
    console.log(`\n**********  Deposit ${amount} ${token} for ${account}  **********\n`)
    let balance = await auctionRepo.getBalance({
      token,
      address: account
    })

    console.log('\n\tPrevious balance:')
    console.log('\t\t- %s: %d', token, balance)

    console.log('\n\tAmount to deposit:')
    console.log('\t\t- %s: %d', token, amount)

    // do the deposit
    await auctionRepo.deposit({ token, amount, address: account })

    balance = await auctionRepo.getBalance({ token: token, address: account })
    console.log('\t\t- %s: %d', token, balance)

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

function weiToEth (wei) {
  return new BigNumber(wei).div(10 ** 18)
}

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
