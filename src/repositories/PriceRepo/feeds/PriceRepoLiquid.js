const debug = require("debug")("DEBUG-dx-service:repositories:PriceRepoLiquid");
const httpRequest = require("../../../helpers/httpRequest");

class PriceRepoLiquid {
  constructor({
    url = "https://api.liquid.com/",
    version = "2",
    timeout = 5000
  }) {
    this._timeout = timeout;
    this._version = version;
    this._baseUrl = url;
  }

  async getPrice({ tokenA, tokenB }) {
    const pairABExist = await this._existTokenPair({ tokenA, tokenB });

    if (pairABExist) {
      return this._getPrice({ tokenA, tokenB });
    } else {
      const [pairAEthExist, pairBEthExist] = await Promise.all([
        this._existTokenPair({ tokenA, tokenB: "ETH" }),
        this._existTokenPair({ tokenA: tokenB, tokenB: "ETH" })
      ]);

      if (pairAEthExist && pairBEthExist) {
        const [tokenAEth, tokenBEth] = await Promise.all([
          this._getPrice({ tokenA, tokenB: "ETH" }),
          this._getPrice({ tokenA: tokenB, tokenB: "ETH" })
        ]);

        return tokenAEth / tokenBEth;
      } else {
        throw Error(
          "No matching markets in Liquid: " +
            tokenA +
            "-" +
            tokenB +
            ". tokenA-ETH exist: " +
            pairAEthExist +
            " tokenB-ETH exist: " +
            pairBEthExist
        );
      }
    }
  }

  async _getPrice({ tokenA, tokenB }) {
    debug("Get price for %s-%s", tokenA, tokenB);

    let tokenPair = await this._getTokenPair({ tokenA, tokenB });

    let lastPrice = tokenPair["last_traded_price"];
    if (tokenPair["base_currency"] == tokenB) {
      lastPrice = 1 / lastPrice;
    }

    debug("Liquid Response to " + tokenPair["currency_pair_code"] + ": ", lastPrice.toString());
    return lastPrice.toString();
  }

  async _getProducts() {
    const url = this._baseUrl + "products";
    debug("Liquid request symbols url: ", url);

    const request = { url, method: "GET", data: {}, timeout: this._timeout };
    const response = await httpRequest.rawRequest(request, {});

    return response;
  }

  // Check if a token pair exists
  async _getTokenPair({ tokenA, tokenB }) {
    var products = await this._getProducts();

    products = products.filter(product => {
      if (product["currency_pair_code"].toLowerCase() ===
      (tokenA + tokenB).toLowerCase() ||
    product["currency_pair_code"].toLowerCase() ===
      (tokenB + tokenA).toLowerCase()) {
        console.log(product["currency_pair_code"].toLowerCase() ===
        (tokenA + tokenB).toLowerCase() ||
      product["currency_pair_code"].toLowerCase() ===
        (tokenB + tokenA).toLowerCase())
        console.log(product["currency_pair_code"].toLowerCase())
      }
     
      return (
        product["currency_pair_code"].toLowerCase() ===
          (tokenA + tokenB).toLowerCase() ||
        product["currency_pair_code"].toLowerCase() ===
          (tokenB + tokenA).toLowerCase()
      );
    });

    if (products.length === 0) {
      throw Error("No matching markets in Liquid: " + tokenA + "-" + tokenB);
    }

    return products[0];
  }

  // Check if a token pair exists
  async _existTokenPair({ tokenA, tokenB }) {
    let products = await this._getProducts();

    products.filter(product => {
      return (
        product["currency_pair_code"].toLowerCase() ==
          (tokenA + tokenB).toLowerCase() ||
        product["currency_pair_code"].toLowerCase() ==
          (tokenB + tokenA).toLowerCase()
      );
    });

    return products.length > 0;
  }
}

module.exports = PriceRepoLiquid;
