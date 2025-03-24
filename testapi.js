const { RestClientV5 } = require('bybit-api');
const { config, pairs, exchange_str, timeframe_str } = require("./params.js");
async function loadDelay() {
    delay = null;
    await import("delay").then((val) => { delay = val.default });
    return delay;
}

async function main(){
    const client = new RestClientV5({
        //   testnet: true,
          demoTrading: true,
          key: config.bybitapikeyspot,
          secret: config.bybitsecretspot,
        });
    delay = await loadDelay();
    await delay(5000);
    client
    .submitOrder({
      category: 'spot',
      symbol: 'ETHUSDC',
      side: 'Sell',
      orderType: 'Market',
      marketUnit: "quoteCoin",
      qty: "955",
    })
    .then((response) => {
      console.log('Market order result', response);
    })
    .catch((error) => {
      console.error('Market order error', error);
    });
}

main()