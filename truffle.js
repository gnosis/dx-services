module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  networks: {
    development: {
      host: '127.0.0.1',
      port: 8545,
      network_id: '*', // Match any network id
      gas: 6700000
    },

    // Kovan
    //  truffle migrate --network kovan
    //  parity --mode active --chain kovan --port 8546
    kovan: {
      host: '127.0.0.1',
      port: 8546,
      network_id: 42,
      gas: 6700000
    },

    // Ronkeby
    //  truffle migrate --network kovan
    rinkeby: {
      host: '127.0.0.1',
      port: 8547, // parity --mode active --chain rinkeby --port 8548
      network_id: 4,
      gas: 6700000
    },

    live: {
      host: '127.0.0.1',
      port: 8546, // parity --mode active --chain rinkeby --port 8548
      network_id: 1,
      gas: 6700000
    }
  },

  solc: {
    optimizer: {
      enabled: true,
      runs: 200
    }
  }
}
