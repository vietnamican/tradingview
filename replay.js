const TradingView = require('@mathieuc/tradingview');
const ccxt = require("ccxt");
const System = require("./Systems/System");

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
    // "AVAXUSDT", 
    // "GRTUSDT", 
    // "RNDRUSDT", 
    // "AGIXUSDT",
    // "ARUSDT", 
    // "BOMEUSDT", 
    // "LINKUSDT", 
    // "MATICUSDT", 
    // "OMNIUSDT", 
    // "OPUSDT", 
    // "SSVUSDT", 
    // "WLDUSDT",
    // "SOLUSDT",
    // "BTCUSDT",
    // "ETHUSDT",
    // "ETHFIUSDT",
    // "ENAUSDT",
    // "WIFUSDT",
    // "LTCUSDT",
    // "BCHUSDT",
    // "TRXUSDT",
    // "ADAUSDT",
    // "DOGEUSDT",
    // "PYTHUSDT",
    // "MEWUSDT",
    // "ARBUSDT",
    // "UNIUSDT",
    // "ICPUSDT",
    // "THETAUSDT",
    // "UMAUSDT",
    // "FRONTUSDT",
    // "PEOPLEUSDT",
    // "MOVRUSDT",
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
    chart.setMarket(`${exchange_str}:${symbol_str}.P`, {
        timeframe: timeframe_str,
        replay: Math.round(Date.now() / 1000) - 86400 * 7, // Seven days before now
        range: 1
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
    timeframe_str = '15'
    symbols.forEach(async symbol_str => {
        await loadPrivateIndicators(config, tvclient, symbol_str, exchange_str, timeframe_str);
    });
    await delay(5000);
    // await delay(symbols.length*1*1000);

    symbols.forEach(symbol_str => {
        const system = new System(exchange_str, bybit, symbol_str, timeframe_str, charts[exchange_str][symbol_str][timeframe_str], indicators[exchange_str][symbol_str][timeframe_str])
        systems.push(system);
    });

    systems.forEach(system=> system.startReplay());

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