const { RestClientV5 } = require('bybit-api');
const TradingView = require('@mathieuc/tradingview');

const { symbols, modes, config, pairs, exchange_str, timeframe_str} = require("./params.js")

async function loadDelay() {
    delay = null;
    await import("delay").then((val) => { delay = val.default });
    return delay;
}

async function loadTradingViewClient(config) {
    return new TradingView.Client({
        token: config.tvsessionid,
        signature: config.tvsession_signature,
    });
}

const indicators = {};
const charts = {};
const systems = [];

async function loadPrivateIndicators(config, tvclient, symbol_str, exchange_str, timeframe_str) {
    const chart = new tvclient.Session.Chart();
    chart.setMarket(`${exchange_str}:${symbol_str}.P`, {
        timeframe: timeframe_str,
    });

    charts[exchange_str] = charts[exchange_str] || {};
    charts[exchange_str][symbol_str] = charts[exchange_str][symbol_str] || {};
    charts[exchange_str][symbol_str][timeframe_str] = chart;

    indicList = await TradingView.getPrivateIndicators(config.tvsessionid);
    await indicList.forEach(async (indic) => {

        // // For Q1Q3 system
        // if (indic.name === "TIENRSI" || indic.name == "TIENEMA"  || indic.name == "TIENADX") {
        //     return;
        // }

        // For RSIQ1Q3 system
        if (indic.name == "TIENEMA"  || indic.name == "TIENADX") {
            return;
        }
        
        const privateIndic = await indic.get();
        console.log(`Indicator ${indic.name} for ${exchange_str}:${symbol_str} loading...`)

        const indicator = new chart.Study(privateIndic);

        indicator.onReady(() => {
            indicators[exchange_str] = indicators[exchange_str] || {};
            indicators[exchange_str][symbol_str] = indicators[exchange_str][symbol_str] || {};
            indicators[exchange_str][symbol_str][timeframe_str] = indicators[exchange_str][symbol_str][timeframe_str] || {};
            indicators[exchange_str][symbol_str][timeframe_str][indic.name] = indicator;
            console.log(`Indicator ${indic.name} for ${exchange_str}:${symbol_str} loaded!`);
        });
    });
}

const bybitClient = new RestClientV5({
    // testnet: false,
    demoTrading: true,
    key: config['bybitapikeyspot'],
    secret: config['bybitsecretspot'],
});

async function main() {
    delay = await loadDelay();
    const tvclient = await loadTradingViewClient(config);
    tvclient.onError((...err) => {
        console.error(`[${moment().format()}] Client got error: ${err}`);
        tvclient.end();
    });

    const promises = pairs.map(async pair => {
        const symbol_str = pair['symbol'];
        console.log(symbol_str);
        return loadPrivateIndicators(config, tvclient, symbol_str, exchange_str, timeframe_str);
    });
    const results = await Promise.all(promises);
    await delay(5000);

    chart = charts[exchange_str]["BTCUSDT"][timeframe_str]
    // indic = indicators[exchange_str]["BTCUSDT"][timeframe_str]['Tien Q1 Q3 Breakout Strategy']
    console.log(timeframe_str)
    indic = indicators[exchange_str]["BTCUSDT"][timeframe_str]['Tien Q1 Q3 Breakout Strategy'].periods;
    // indic = indicators[exchange_str]["BTCUSDT"][timeframe_str]['TIENRSI'].periods[0];

    chart.onUpdate(() => {
        console.log(chart.periods[0]);
        console.log(indic[0]);
        // console.log(indic["$time"])
    })

    // pairs.forEach(pair => {
    //     const symbol_str = pair['symbol']
    //     const resume_path = path.join(exchange_str, timeframe_str, symbol_str + ".txt");
    //     const system = new System
    //     if (pair['mode'] === 'normal') {
    //         const system = new SystemADX(exchange_str, bybit, symbol_str, timeframe_str, charts[exchange_str][symbol_str][timeframe_str], indicators[exchange_str][symbol_str][timeframe_str], resume_path)
    //         systems.push(system);
    //     } else if (pair['mode'] === 'inverse') {
    //         const system = new SystemADXInverse(exchange_str, bybit, symbol_str, timeframe_str, charts[exchange_str][symbol_str][timeframe_str], indicators[exchange_str][symbol_str][timeframe_str], resume_path)
    //         systems.push(system);
    //     }
    // });

    await delay(5000);


    // // Get precision
    // let basePrecision = -1
    // let quotePrecision = -1
    // bybitClient.getInstrumentsInfo({
    //     category: 'spot',
    //     symbol: 'BTCUSDT',
    // })
    // .then((response) => {
    //     basePrecision = response["result"]["list"][0]["lotSizeFilter"]["basePrecision"]
    //     quotePrecision = response["result"]["list"][0]["lotSizeFilter"]["quotePrecision"]
    //     console.log(response);
    // })
    // .catch((error) => {
    //     console.error(error);
    // });
    // await delay(5000);
 
    // // Spot buy
    // const symbol = 'BTCUSDT'
    // const type = "market";
    // const side = "buy";
    // const amount = 500 // 500 USDT
    // await bybitClient.submitOrder({
    //     category: 'spot',
    //     symbol: 'BTCUSDT',
    //     side: 'Buy',
    //     orderType: 'Market',
    //     marketUnit: "quoteCoin",
    //     qty: '500',

    // })
    // .then((response) => {
    //     console.log('Market order result', response);
    // })
    // .catch((error) => {
    // console.error('Market order error', error);
    // });
    // await delay(5000);


    // // Get balance
    // let balance = -1;
    // let usdtbalance = -1
    // await bybitClient.getWalletBalance({
    //     accountType: 'UNIFIED',
    //     coin: 'BTC',
    // })
    // .then((response) => {
    //     console.log(response);
    //     // console.log(response["result"])
    //     console.log(response["result"]["list"][0]["coin"])
    //     balance = String(floor(response["result"]["list"][0]["coin"][0]["walletBalance"] * 1.0, basePrecision))
    //     console.log(response["result"]["list"][0]["coin"][0]["usdValue"])
    //     usdtbalance = (response["result"]["list"][0]["coin"][0]["usdValue"] * 0.98).toFixed(2)
    // })
    // .catch((error) => {
    //     console.error(error);
    // });
    // await delay(5000);
    // console.log(usdtbalance);

    // // Sell all
    // await bybitClient.submitOrder({
    //     category: 'spot',
    //     symbol: 'BTCUSDT',
    //     side: 'Sell',
    //     orderType: 'Market',
    //     // marketUnit: "quoteCoin",
    //     // qty: usdtbalance,
    //     marketUnit: "baseCoin",
    //     qty: balance,

    // })
    // .then((response) => {
    //     console.log('Market order result', response);
    // })
    // .catch((error) => {
    // console.error('Market order error', error);
    // });

}

function floor(number, precision) {
    return Math.floor(number / precision) * precision;
}
function round(number, precision) {
    return Math.round(number / precision) * precision;
}

main()
