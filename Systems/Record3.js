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
timestart = 1715000000;
timeend = 1715472000;

// const timeframes = ['1', '3', '5', '15', '30', '45', '60', '120', '180', '240', 'D', 'W']
const timeframes = ['15']
// const charts = {};
// const indicators = {};


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
// async function loadChart(config, tvclient, symbol_str, exchange_str, timeframe_str, piecetimestart, piecetimeend, nobars) {
async function loadChart(config, tvclient, symbol_str, exchange_str, timeframe_str) {
    const chart = new tvclient.Session.Chart();
    await chart.setMarket(`${exchange_str}:${symbol_str}.P`, {
        timeframe: timeframe_str,
        // range: 1, // Range is negative, so 'to' means 'from'
        // from: piecetimestart, // Seven days before now
        // to: piecetimeend,
    });
    return chart;
}
async function loadPrivateIndicators(config, chart, symbol_str, exchange_str, timeframe_str, csvwriter) {
    indicList = await TradingView.getPrivateIndicators(config.tvsessionid);
    const indicators = {};
    await indicList.forEach(async (indic) => {
        const privateIndic = await indic.get();
        console.log(`Indicator ${indic.name} for ${exchange_str}:${symbol_str} loading...`)

        const indicator = new chart.Study(privateIndic);

        indicator.onReady(async () => {
            indicators[indic.name] = indicator;
            // console.log(`Indicator ${indic.name} for ${exchange_str}:${symbol_str} loaded!`);
            // console.log(csvwriter['indicators']);
            console.log(indicator.periods.length);
            await csvwriter['indicators'][indic.name].writeRecords([indicator.periods[indicator.periods.length-1]]);
        });
    });
    await delay(2000);
    return indicators;
}

async function registerUpdate(chart, timeframe_str, timestart, cb) {
    const timeframe = convertTimeframeStrToSecond(timeframe_str);
    console.log("register update", timeframe);
    // console.log(csvwriter['chart']);
    chart.onUpdate(async () => {
        if (chart.periods[chart.periods.length - 1].time - timeframe <= timestart) {
            cb();
            return;
        }
        // console.log(chart.periods.length, chart.periods[chart.periods.length - 1].time, timestart)
        // console.log(chart.periods.length, timestart);
        await chart.fetchMore(100);
    });
    // chart.fetchMore(1);
    // while(chart.periods[chart.periods.length - 1] - timeframe >timestart){
    //     await chart.fetchMore(1);
    //     console.log(chart.periods.length, timestart);
    // }
    // cb();
}

function createcsvwriter(exchange_str, symbol_str, timeframe_str){
    // create folders
    ret = {};
    const nesteddir = path.join(__dirname, String(exchange_str), String(symbol_str), String(timeframe_str));
    fs.mkdirSync(nesteddir, { recursive: true });

    const chart_file_name = path.join(nesteddir, "chart.csv");
    ret["chart"] = createCsvWriter({
        path: chart_file_name,
        header: [
            {id: 'time', title: 'time'},
            {id: 'open', title: 'open'},
            {id: 'max', title: 'high'},
            {id: 'min', title: 'low'},
            {id: 'close', title: 'close'},
            {id: 'volume', title: 'volume'},
        ]
    });

    const indicatordir = path.join(nesteddir, "indicators");
    fs.mkdirSync(indicatordir, { recursive: true });
    const indicators = ['TIENEMA', 'TIENRSI']
    ret['indicators'] = {};

    ret['indicators']['TIENEMA'] = createCsvWriter({
        path: path.join(indicatordir, `TIENEMA.csv`),
        header: [
            {id: '$time', title: 'time'},
            {id: '5', title: '5'},
            {id: '10', title: '10'},
            {id: '20', title: '20'},
            {id: '50', title: '50'},
            {id: '100', title: '100'},
            {id: '200', title: '200'},
        ]
    });
    ret['indicators']['TIENRSI']  = createCsvWriter({
        path: path.join(indicatordir, `TIENRSI.csv`),
        header: [
            {id: '$time', title: 'time'},
            {id: 'RSI', title: 'RSI'},
            {id: 'RSIbased_MA', title: 'FastMA'},
            {id: 'RSIbased_MA_2', title: 'LowMA'},
        ]
    });
    Object.keys(indicators).forEach((indicator_str) => {
        const indicator_file_name = path.join(indicatordir, `${indicator_str}.csv`);

        rows = []
        if (indicator_str === "TIENEMA") {
            ret['indicators']['TIENEMA'] = createCsvWriter({
                path: indicator_file_name,
                header: [
                    {id: '$time', title: 'time'},
                    {id: '5', title: '5'},
                    {id: '10', title: '10'},
                    {id: '20', title: '20'},
                    {id: '50', title: '50'},
                    {id: '100', title: '100'},
                    {id: '200', title: '200'},
                ]
            });
        }
        else if (indicator_str === "TIENRSI") {
            ret['indicators']['TIENRSI']  = createCsvWriter({
                path: indicator_file_name,
                header: [
                    {id: '$time', title: 'time'},
                    {id: 'RSI', title: 'RSI'},
                    {id: 'RSIbased_MA', title: 'FastMA'},
                    {id: 'RSIbased_MA_2', title: 'LowMA'},
                ]
            });
        }
    })
    return ret;
}

function writetocsv(chart, indicators, exchange_str, symbol_str, timeframe_str) {
    // create folders
    const nesteddir = path.join(__dirname, String(exchange_str), String(symbol_str), String(timeframe_str));
    fs.mkdirSync(nesteddir, { recursive: true });

    const chart_file_name = path.join(nesteddir, "chart.csv");
    const csvWriter = createCsvWriter({
        path: chart_file_name,
        header: [
            {id: 'time', title: 'time'},
            {id: 'open', title: 'open'},
            {id: 'max', title: 'high'},
            {id: 'min', title: 'low'},
            {id: 'close', title: 'close'},
            {id: 'volume', title: 'volume'},

        ]
    });
    // console.log(chart.periods);
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
    // const tvclient = await loadTradingViewClient(config);
    const exchange_str = "BYBIT";
    const nobars = 20;
    symbols.forEach(async (symbol_str) => {
        timeframes.forEach(async (timeframe_str) => {
            const timeframe = convertTimeframeStrToSecond(timeframe_str)
            // console.log(range(timeend, timestart, -timeframe*nobars));
            // console.log(timeend);
            // console.log(timestart);
            // console.log(timeframe*nobars);
            // const csvwriter = createcsvwriter(exchange_str, symbol_str, timeframe_str);
            // console.log(csvwriter['chart']);
            const tvclient = await loadTradingViewClient(config);
            const chart = await loadChart(config, tvclient, symbol_str, exchange_str, timeframe_str);
            // const indicators = await loadPrivateIndicators(config, chart, symbol_str, exchange_str, timeframe_str, csvwriter);
            // const indicators = {};
            const cb = async () => {
                // console.log("Length:", chart.periods.length);
                // const indicators = await loadPrivateIndicators(config, chart, symbol_str, exchange_str, timeframe_str) 
                writetocsv(chart, indicators, exchange_str, symbol_str, timeframe_str);
                tvclient.end()
            }
            console.log(csvwriter['chart']);
            await registerUpdate(chart, timeframe_str, timestart, cb, csvwriter);
            // delay(5000);
            // console.log(indicators['TIENEMA'].periods.length);
            // for (piecetimeend in range(timeend, timestart, -timeframe*nobars)){
            //     const piecetimestart = piecetimeend - timeframe*nobars;

            // }
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


function range(start, end, step) {
    var range = [];
    var typeofStart = typeof start;
    var typeofEnd = typeof end;

    if (step === 0) {
        throw TypeError("Step cannot be zero.");
    }

    if (typeofStart == "undefined" || typeofEnd == "undefined") {
        throw TypeError("Must pass start and end arguments.");
    } else if (typeofStart != typeofEnd) {
        throw TypeError("Start and end arguments must be of same type.");
    }

    typeof step == "undefined" && (step = 1);

    if (typeofStart == "number") {

        while (step > 0 ? end >= start : end <= start) {
            range.push(start);
            start += step;
        }

        while (step < 0 ? end <= start : end >= start) {
            range.push(start);
            start += step;
        }

    } else if (typeofStart == "string") {

        if (start.length != 1 || end.length != 1) {
            throw TypeError("Only strings with one character are supported.");
        }

        start = start.charCodeAt(0);
        end = end.charCodeAt(0);

        while (step > 0 ? end >= start : end <= start) {
            range.push(String.fromCharCode(start));
            start += step;
        }

        while (step < 0 ? end <= start : end >= start) {
            range.push(String.fromCharCode(start));
            start += step;
        }

    } else {
        throw TypeError("Only string and number types are supported");
    }

    return range;

}