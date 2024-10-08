const TradingView = require('@mathieuc/tradingview');
const ccxt = require("ccxt");
const System = require("./Systems/SystemADX.js");

// const delay = require("delay");

/**
 * This example creates a BTCEUR daily chart
 */
const config = {
    "tvsessionid": "zy3uyqjsxgoz0m6qc8ib5temuhn50whx",
    "tvsession_signature": "v2:QXLsqREIzx8YETlWLN/nydbDRIPKa07VALvP6tU53Sg=",
    "binanceapikey": "c8f19afe063d9ada608ad3c4f72ed0275397932ab01c098867b786d4267f7841",
    "binancesecret": "d2bb0fc9615325725498d98985867fa6d524ddfae8a12d4db3064155fc4e8786",
    "bybitapikey": "45hfTYQMkjzeUDd7A0",
    "bybitsecret": "VSIypoUtGbSWkGampXslwYaTDictVrWEdgS9"
}

const symbols = [
    "NEARUSDT", 
    "AVAXUSDT", 
    "GRTUSDT", 
    "RNDRUSDT", 
    "AGIXUSDT",
    "ARUSDT", 
    "BOMEUSDT", 
    "LINKUSDT", 
    "MATICUSDT", 
    "OMNIUSDT", 
    "OPUSDT", 
    "SSVUSDT", 
    "WLDUSDT"
];

// const symbols = ["NEARUSDT",  "AVAXUSDT"];

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

async function loadBybitTrading(config) {
    const exchange = new ccxt.bybit({
        "apiKey": config.bybitapikey,
        "secret": config.bybitsecret
    });

    exchange.enable_demo_trading(true);
    exchange.options["defaultType"] = 'future';
    return exchange;
}

const indicators = {};
const charts = {};
const systems = [];

async function loadPrivateIndicators(config, tvclient, symbol_str, exchange_str, timeframe_str) {
    const chart = new tvclient.Session.Chart();
    chart.setMarket(`${exchange_str}:${symbol_str}`, {
        timeframe: timeframe_str,
    });

    charts[exchange_str] = charts[exchange_str] || {};
    charts[exchange_str][symbol_str] = charts[exchange_str][symbol_str] || {};
    charts[exchange_str][symbol_str][timeframe_str] = chart;

    indicList = await TradingView.getPrivateIndicators(config.tvsessionid);
    await indicList.forEach(async (indic) => {
        const privateIndic = await indic.get();
        // console.log('Loading indicator', indic.name, 'for', exchange_str,  ":", symbol_str, "...");
        console.log(`Loading indicator ${indic.name} for ${exchange_str}:${symbol_str}...`)

        const indicator = new chart.Study(privateIndic);

        indicator.onReady(() => {
            // indicators[exchange_str][symbol_str][timeframe_str][indic.name] ??= indicator;
            indicators[exchange_str] = indicators[exchange_str] || {};
            indicators[exchange_str][symbol_str] = indicators[exchange_str][symbol_str] || {};
            indicators[exchange_str][symbol_str][timeframe_str] = indicators[exchange_str][symbol_str][timeframe_str] || {};
            indicators[exchange_str][symbol_str][timeframe_str][indic.name] = indicator;
            console.log('Indicator', indic.name, 'loaded !');
        });
    });
    await delay(2000);
}

async function main() {
    delay = await loadDelay();
    const tvclient = await loadTradingViewClient(config);
    // console.log(tvclient);

    const bybit = await loadBybitTrading(config);
    // console.log(bybit);


    // exchange_str = "BYBIT"
    // timeframe_str = '1'
    // symbols.forEach(async symbol_str => {
    //     await loadPrivateIndicators(config, tvclient, symbol_str, exchange_str, timeframe_str);
    // });
    // await delay(symbols.length*2*1000);
    // console.log(indicators[exchange_str]["NEARUSDT"]["1"]['TIENRSI'].periods[0])

    // symbols.forEach(symbol_str => {
    //     const system = new System(exchange_str, bybit, symbol_str, timeframe_str, charts[exchange_str][symbol_str][timeframe_str], indicators[exchange_str][symbol_str][timeframe_str])
    //     systems.push(system);
    // });

    // systems.forEach(system=> system.start());


    const symbol = 'NEARUSDT'
    const amount = 135.5
    params = {
        "category":"linear",
        "side": "Buy",
        "orderType": "Market",
    }
    const buy_order = await bybit.createMarketBuyOrderWithCost(symbol, amount, params)
    console.log(buy_order);

    await delay(15*1000);

    params = {
        "category":"linear",
        "side": "Sell",
        "orderType": "Market"
    }
    const sell_order = await bybit.createMarketBuyOrderWithCost(symbol, amount, params)
    console.log(sell_order);
}

main()
// tvclient = loadTradingViewClient(config);
// const chart = new tvclient.Session.Chart(); // Init a Chart session

// chart.setMarket('BINANCE:BTCUSDT', { // Set the market
//     timeframe: '1',
// });

// chart.onError((...err) => { // Listen for errors (can avoid crash)
//     console.error('Chart error:', ...err);
//     // Do something...
// });

// chart.onSymbolLoaded(() => { // When the symbol is successfully loaded
//     console.log(`Market "${chart.infos.description}" loaded !`);
// });

// lasttime = -1;
// ttime = -1
// topen = -1
// tmax = -1
// tmin = -1
// tclose = -1
// tvolume = -1

// const indicators = []

// async function addIndicator(name, pineId, options = {}) {

//     const indic = pineId.includes('@')
//         ? new TradingView.BuiltInIndicator(pineId)
//         : await TradingView.getIndicator(pineId);
//     Object.keys(options).forEach((o) => { indic.setOption(o, options[o]); });

//     const std = new chart.Study(indic);

//     std.onReady(() => {
//         indicators.push([name, std]);
//     });
// }
// const indicators = []
// TradingView.getPrivateIndicators(config.tvsessionid).then((indicList) => {
//     indicList.forEach(async (indic) => {
//         const privateIndic = await indic.get();
//         console.log('Loading indicator', indic.name, '...');

//         const indicator = new chart.Study(privateIndic);
//         privateIndic.getOptions();
//         indicator.onReady(() => {
//             indicators.push([indic.name, indic]);
//             console.log('Indicator', indic.name, 'loaded !');
//         });

//     });
// });

// // addPrivateIndicator();
// // addIndicator('EMA_5', 'STD;EMA', { Length: 7 });
// // addIndicator('EMA_10', 'STD;EMA', { Length: 10 });
// // addIndicator('EMA_20', 'STD;EMA', { Length: 20 });
// // addIndicator('EMA_50', 'STD;EMA', { Length: 50 });
// // addIndicator('EMA_200', 'STD;EMA', { Length: 200 });
// // addIndicator('RSI', 'STD;RSI', { RSI_Length: 10 });

// chart.onUpdate(() => { // When price changes
//     if (!chart.periods[0]) return;

//     if (chart.periods[0].time != lasttime) {
//         lasttime = chart.periods[0].time
//         console.log(`${Date.now()} ${ttime} ${topen} ${tmax} ${tmin} ${tclose} ${tvolume}`);
//         indicators.forEach(([n, i]) => {
//             i.options;
//             // console.log(i.script);
//         })
//     }
//     else {
//         ttime = chart.periods[0].time
//         topen = chart.periods[0].open
//         tmax = chart.periods[0].max
//         tmin = chart.periods[0].min
//         tclose = chart.periods[0].close
//         tvolume = chart.periods[0].volume
//         indicators.forEach(([n, i]) => {
//             i.options;
//         })
//     }
// });
