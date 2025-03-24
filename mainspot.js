const moment = require("moment");
const path = require('path');
const TradingView = require('@mathieuc/tradingview');
const { RestClientV5 } = require('bybit-api');
// const ccxt = require("ccxt");
// const SystemQ1Q3 = require("./SystemsSpot/SystemQ1Q3");
// const SystemRSIQ1Q3 = require("./SystemsSpot/SystemRSIQ1Q3");
const SystemCombine = require("./SystemsSpot/SystemCombine");
const { config, pairs, exchange_str, timeframe_str } = require("./params.js");

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
    const exchange = new RestClientV5({
        // testnet: false,
        demoTrading: true,
        key: config['bybitapikeyspot'],
        secret: config['bybitsecretspot'],
    });
    return exchange;
}

const indicators = {};
const charts = {};
const systems = [];

async function loadPrivateIndicators(config, tvclient, symbol_str, exchange_str, timeframe_str) {
    const chart = new tvclient.Session.Chart();
    // Fix chart to binance, spot 
    chart.setMarket(`${exchange_str}:${symbol_str}`, {
        timeframe: timeframe_str,
    });

    charts[exchange_str] = charts[exchange_str] || {};
    charts[exchange_str][symbol_str] = charts[exchange_str][symbol_str] || {};
    charts[exchange_str][symbol_str][timeframe_str] = chart;

    chart.onError((...err) => {
        console.log(`[${moment().format()}] Chart ${exchange_str}:${symbol_str} got error: ${err}`);
    })

    indicList = await TradingView.getPrivateIndicators(config.tvsessionid);
    await indicList.forEach(async (indic) => {

        list_indicator_names = ["Combine Indicator"]
        // For Q1Q3 system
        if (!list_indicator_names.includes(indic.name)) {
            return;
        }

        // // For RSIQ1Q3 system
        // if (indic.name == "TIENEMA"  || indic.name == "TIENADX") {
        //     return;
        // }
        
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

        indicator.onError((...err) => {
            console.log(`[${moment().format()}] Indicator ${indic.name} for ${exchange_str}:${symbol_str} got error: ${err}`);
        })
    });
    await delay(5000);
}

async function main() {
    delay = await loadDelay();
    const tvclient = await loadTradingViewClient(config);
    tvclient.onError((...err) => {
        console.error(`[${moment().format()}] Client got error: ${err}`);
        tvclient.end();
    });
    const bybit = await loadBybitTrading(config);

    const promises = pairs.map(async pair => {
        const symbol_str = pair['symbol'];
        return loadPrivateIndicators(config, tvclient, symbol_str, exchange_str, timeframe_str);
    });
    const results = await Promise.all(promises);
    // await delay(5000);
    // await delay(symbols.length * 5 * 1000);

    pairs.forEach(pair => {
        const symbol_str = pair['symbol']
        const resume_path = path.join(exchange_str, timeframe_str, symbol_str + ".txt");
        const system = new SystemCombine(exchange_str, bybit, symbol_str, timeframe_str, charts[exchange_str][symbol_str][timeframe_str], indicators[exchange_str][symbol_str][timeframe_str], resume_path);
        // const system = new SystemRSIQ1Q3(exchange_str, bybit, symbol_str, timeframe_str, charts[exchange_str][symbol_str][timeframe_str], indicators[exchange_str][symbol_str][timeframe_str], resume_path);
        systems.push(system);
    });

    systems.forEach(system => system.resume());
}

main()