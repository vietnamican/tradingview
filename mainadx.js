const moment = require("moment");
const TradingView = require('@mathieuc/tradingview');
const ccxt = require("ccxt");
const System = require("./Systems/SystemADX");
const { config, symbols, exchange_str, timeframe_str } = require("./params.js");

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
    });

    charts[exchange_str] = charts[exchange_str] || {};
    charts[exchange_str][symbol_str] = charts[exchange_str][symbol_str] || {};
    charts[exchange_str][symbol_str][timeframe_str] = chart;

    chart.onError((...err) => {
        console.log(`[${moment().format()}] Chart ${exchange_str}:${symbol_str} got error: ${err}`);
    })

    indicList = await TradingView.getPrivateIndicators(config.tvsessionid);
    await indicList.forEach(async (indic) => {
        if (indic.name === "TIENRSI") {
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

        indicator.onError((...err) => {
            console.log(`[${moment().format()}] Indicator ${indic.name} for ${exchange_str}:${symbol_str} got error: ${err}`);
        })
    });
    await delay(2000);
}

async function main() {
    delay = await loadDelay();
    const tvclient = await loadTradingViewClient(config);
    tvclient.onError((...err) => {
        console.error(`[${moment().format()}] Client got error: ${err}`);
        tvclient.end();
    });
    const bybit = await loadBybitTrading(config);

    symbols.forEach(async symbol_str => {
        await loadPrivateIndicators(config, tvclient, symbol_str, exchange_str, timeframe_str);
    });
    // await delay(5000);
    await delay(symbols.length * 1 * 1000);

    symbols.forEach(symbol_str => {
        const system = new System(exchange_str, bybit, symbol_str, timeframe_str, charts[exchange_str][symbol_str][timeframe_str], indicators[exchange_str][symbol_str][timeframe_str])
        systems.push(system);
    });

    systems.forEach(system => system.start());
}

main()