const { Client } = require('@mathieuc/tradingview');
const TradingView = require('@mathieuc/tradingview');
const fs = require('fs');
const path = require('path');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;


/**
 * This example tests the fake replay mode which
 * works in intraday even with free plan
 */

const config = {
    "tvsessionid": "zy3uyqjsxgoz0m6qc8ib5temuhn50whx",
    "tvsession_signature": "v2:QXLsqREIzx8YETlWLN/nydbDRIPKa07VALvP6tU53Sg=",
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
// timestart = 1451606400;
timestart = 1715385600;

// const timeframes = ['1', '3', '5', '15', '30', '45', '60', '120', '180', '240', 'D', 'W']
const timeframes = ['15']
const charts = {};
const indicators = {};


console.log('----- Recording...: -----');

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
async function loadChart(config, tvclient, symbol_str, exchange_str, timeframe_str) {
    const chart = new tvclient.Session.Chart();
    await chart.setMarket(`${exchange_str}:${symbol_str}.P`, {
        timeframe: timeframe_str,
        range: 1, // Range is negative, so 'to' means 'from'
        from: 1451606400, // Seven days before now
        to: Math.round(Date.now() / 1000),
    });

    charts[exchange_str] = charts[exchange_str] || {};
    charts[exchange_str][symbol_str] = charts[exchange_str][symbol_str] || {};
    charts[exchange_str][symbol_str][timeframe_str] = chart;
}
async function loadPrivateIndicators(config, chart, symbol_str, exchange_str, timeframe_str) {
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
            // console.log(`Indicator ${indic.name} for ${exchange_str}:${symbol_str} loaded!`);
        });
    });
    await delay(2000);
}

async function registerUpdate(chart, timeframe_str, timestart, cb) {
    const timeframe = convertTimeframeStrToSecond(timeframe_str);
    console.log("register update", timeframe);
    chart.onUpdate(async () => {
        if (chart.periods[chart.periods.length - 1].time - timeframe <= timestart) {
            cb();
            return;
        }
        console.log(chart.periods.length, chart.periods[chart.periods.length - 1].time, timestart)
        // console.log(chart.periods.length, timestart);
        await chart.fetchMore(1);
    });
    // chart.fetchMore(1);
    // while(chart.periods[chart.periods.length - 1] - timeframe >timestart){
    //     await chart.fetchMore(1);
    //     console.log(chart.periods.length, timestart);
    // }
    // cb();
}

function writetocsv(chart, indicators, exchange_str, symbol_str, timeframe_str) {
    // create folders
    const nesteddir = path.join(__dirname, String(exchange_str), String(symbol_str), String(timeframe_str));
    fs.mkdirSync(nesteddir, { recursive: true });

    const chart_file_name = path.join(nesteddir, "chart.csv");
    const csvWriter = createCsvWriter({
        path: chart_file_name,
        headers: ["Timestamp", "Open", "High", "Low", "Close", "Volume"]
    });
    csvWriter
        .writeRecords(chart.periods)
        .then(() => console.log('Write csv file successfully'))
        .catch((error) => console.error(error));


    const indicatordir = path.join(nesteddir, "indicators");
    fs.mkdirSync(indicatordir, { recursive: true });
    Object.keys(indicators).forEach((indicator_str) => {
        const indicator_file_name = path.join(indicatordir, `${indicator_str}.csv`);

        rows = []
        if (indicator_str === "TIENEMA") {
            const csvWriter = createCsvWriter({
                path: indicator_file_name,
                headers: ["Timestamp", "5", "10", "20", "50", "100", "200"]
            });
            indicators[indicator_str].periods.forEach((r) => {
                rows.push([r['$time'], r['5'], r['10'], r['20'], r['50'], r['100'], r['200']]);
            })
            csvWriter
                .writeRecords(indicators[indicator_str].periods)
                .then(() => console.log('Write csv file successfully'))
                .catch((error) => console.error(error));
        }
        else if (indicator_str === "TIENRSI") {
            const csvWriter = createCsvWriter({
                path: indicator_file_name,
                headers: ["Timestamp", "RSI", "FastMA", "LowMA"]
            });
            indicators[indicator_str].periods.forEach((r) => {
                rows.push([r['$time'], r['RSI'], r['RSIbased_MA'], r['RSIbased_MA_2']])
            })
            csvWriter
                .writeRecords(indicators[indicator_str].periods)
                .then(() => console.log('Write csv file successfully'))
                .catch((error) => console.error(error));
        }
    })
}

async function main() {
    delay = await loadDelay();
    const tvclient = await loadTradingViewClient(config);
    exchange_str = "BYBIT";
    symbols.forEach(async (symbol_str) => {
        timeframes.forEach(async (timeframe_str) => {
            await loadChart(config, tvclient, symbol_str, exchange_str, timeframe_str);
            cb_function = async () => {
                await loadPrivateIndicators(config, charts[exchange_str][symbol_str][timeframe_str], symbol_str, exchange_str, timeframe_str);
                writetocsv(charts[exchange_str][symbol_str][timeframe_str], indicators[exchange_str][symbol_str][timeframe_str], exchange_str, symbol_str, timeframe_str);
            }

            await registerUpdate(charts[exchange_str][symbol_str][timeframe_str], timeframe_str, timestart, cb_function);
        })
    })
    // symbols.forEach(async (symbol_str) => {
    //     timeframes.forEach(async (timeframe_str) => {
    //         cb_function = async () => {
    //             await loadPrivateIndicators(config, tvclient, symbol_str, exchange_str, timeframe_str);
    //             await writetocsv(charts[exchange_str][symbol_str][timeframe_str], indicators[exchange_str][symbol_str][timeframe_str], exchange_str, symbol_str, timeframe_str);
    //         }

    //         await registerUpdate(charts[exchange_str][symbol_str][timeframe_str], timeframe_str, timestart, cb_function);
    //         // await loadChart(config, tvclient, symbol_str, exchange_str, timeframe_str);
    //     })
    // })
    // symbols.forEach(async (symbol_str) => {
    //     timeframes.forEach(async (timeframe_str) => {
    //         await loadPrivateIndicators(config, tvclient, symbol_str, exchange_str, timeframe_str);
    //     })
    // })
    // await delay(5000);
    // // await delay(symbols.length*1000);
    // symbols.forEach((symbol_str) => {
    //     timeframes.forEach((timeframe_str) => {
    //         cb_function = () => { return writetocsv(charts[exchange_str][symbol_str][timeframe_str], indicators[exchange_str][symbol_str][timeframe_str], exchange_str, symbol_str, timeframe_str); }
    //         cb_function_2 = () => { return loadPrivateIndicators(config, tvclient, symbol_str, exchange_str, timeframe_str) };
    //         registerUpdate(charts[exchange_str][symbol_str][timeframe_str], timeframe_str, timestart, cb_function);
    //     })
    // })

    // symbols.forEach(async (symbol_str) => {
    //     timeframes.forEach(async (timeframe_str) => {
    //         writetocsv(charts[exchange_str][symbol_str][timeframe_str], indicators[exchange_str][symbol_str][timeframe_str], exchange_str, symbol_str, timeframe_str);
    //     })
    // })

}

function convertTimeframeStrToSecond(timeframe_str) {
    switch (timeframe_str) {
        case '1':
            return 60;
        case '3':
            return 180;
        case '5':
            return 300;
        case '15':
            return 15 * 60;
        case '30':
            return 30 * 60;
        case '45':
            return 45 * 60;
        case '120':
            return 120 * 60;
        case '180':
            return 180 * 60;
        case '240':
            return 240 * 60;
        case 'D':
            return 86400;
        case 'W':
            return 604800;
    }
}

main();