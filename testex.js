const TradingView = require('@mathieuc/tradingview');
const ccxt = require("ccxt");
// const System = require("./System");
const System = require("./SystemCost");
// const delay = require("delay");

/**
 * This example creates a BTCEUR daily chart
 */
const config = {
    "tvsessionid": "fiob6mu4x5kgv5fs9q4wg1ecx3p2we8a",
    "tvsession_signature": "v2:+gmH/6w69h3uhb2unzMH6N4rp9gffm0TtQ2Yr8eBjjg=",
    "binanceapikey": "c8f19afe063d9ada608ad3c4f72ed0275397932ab01c098867b786d4267f7841",
    "binancesecret": "d2bb0fc9615325725498d98985867fa6d524ddfae8a12d4db3064155fc4e8786",
    "bybitapikey": "IWBxUtijPL9f8Lq0eT",
    "bybitsecret": "gGQLqDA473aXI9DUFQ9p0EDt6bwShnoQssCh"
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
    "WLDUSDT",
    "SOLUSDT",
    "BTCUSDT",
    "ETHUSDT",
    "ETHFIUSDT",
    "ENAUSDT",
    "WIFUSDT",
    "LTCUSDT",
    "BCHUSDT",
    "TRXUSDT",
    "ADAUSDT",
    "DOGEUSDT",
    "PYTHUSDT",
    "MEWUSDT",
    "ARBUSDT",
    "UNIUSDT",
    "ICPUSDT",
    "THETAUSDT",
    "UMAUSDT",
    "FRONTUSDT",
    "PEOPLEUSDT",
    "MOVRUSDT",
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
    exchange.load_markets();
    return exchange;
}

const indicators = {};
const charts = {};
const systems = [];

async function loadPrivateIndicators(config, tvclient, symbol_str, exchange_str, timeframe_str) {
    const chart = new tvclient.Session.Chart();
    // const symbol_strp = symbol_str + ".P"
    // console.log(symbol_strp)
    chart.setMarket(`${exchange_str}:${symbol_str}.P`, {
        timeframe: timeframe_str,
    });

    charts[exchange_str] = charts[exchange_str] || {};
    charts[exchange_str][symbol_str] = charts[exchange_str][symbol_str] || {};
    charts[exchange_str][symbol_str][timeframe_str] = chart;

    indicList = await TradingView.getPrivateIndicators(config.tvsessionid);
    await indicList.forEach(async (indic) => {
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
    await delay(2000);
}

async function main() {
    delay = await loadDelay();
    const tvclient = await loadTradingViewClient(config);
    // console.log(tvclient);

    const bybit = await loadBybitTrading(config);
    // console.log(bybit);


    exchange_str = "BYBIT"
    timeframe_str = '1'
    symbols.forEach(async symbol_str => {
        await loadPrivateIndicators(config, tvclient, symbol_str, exchange_str, timeframe_str);
    });
    // await delay(5000);
    await delay(symbols.length*1*1000);

    symbols.forEach(symbol_str => {
        const system = new System(exchange_str, bybit, symbol_str, timeframe_str, charts[exchange_str][symbol_str][timeframe_str], indicators[exchange_str][symbol_str][timeframe_str])
        systems.push(system);
    });

    systems.forEach(system=> system.start());

    // const mk = await bybit.fetchMarkets(category="linear", symbol="DOGEUSDT");
    // console.log(mk);
    // const symbol = 'DOGEUSDT'
    // const amount = 135.5
    // params = {
    //     "category":"linear",
    //     "side": "Buy",
    //     "orderType": "Market",
    // }
    // const buy_order = await bybit.createMarketBuyOrderWithCost(symbol, amount, params)
    // console.log(buy_order);

    // await delay(15*1000);

    // params = {
    //     "category":"linear",
    //     "side": "Sell",
    //     "orderType": "Market"
    // }
    // const sell_order = await bybit.createMarketBuyOrderWithCost(symbol, amount, params)
    // console.log(sell_order);
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
