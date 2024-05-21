const ccxt = require("ccxt");
const moment = require("moment");
const { range } = require("./utils");
const asciichart = require('asciichart');

const config = {
    "tvsessionid": "zy3uyqjsxgoz0m6qc8ib5temuhn50whx",
    "tvsession_signature": "v2:QXLsqREIzx8YETlWLN/nydbDRIPKa07VALvP6tU53Sg=",
    "binanceapikey": "c8f19afe063d9ada608ad3c4f72ed0275397932ab01c098867b786d4267f7841",
    "binancesecret": "d2bb0fc9615325725498d98985867fa6d524ddfae8a12d4db3064155fc4e8786",
    "bybitapikey": "IWBxUtijPL9f8Lq0eT",
    "bybitsecret": "gGQLqDA473aXI9DUFQ9p0EDt6bwShnoQssCh"
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

function convertToEpochTime(formattedDateTime) {
    const date = new Date(formattedDateTime);
    const epochTime = date.getTime();
    return epochTime;
}

async function statistic() {
    bybit = await loadBybitTrading(config);
    const starttimeFormatted = "2024-05-20T23:00:00+07:00"
    const starttime = convertToEpochTime(starttimeFormatted);
    console.log(starttime);
    // const starttime = 1716045120000
    const endtime = Date.now();
    step = 60 * 60 * 1000;
    const results = []
    // console.log(range(endtime, starttime, -step));
    const ranges = range(endtime, starttime, -step);
    for (let i = 0; i < ranges.length; i++) {
        const pieceoftimeend = ranges[i];
        const pieceoftimestart = pieceoftimeend - step < starttime ? starttime : pieceoftimeend - step;

        const result = await bybit.fetchPositionsHistory(symbol = "", pieceoftimestart, limit = 100, params = { "caterogy": "linear", "endTime": pieceoftimeend });
        results.push(...result);
        console.log(results.length);
        console.log(results[0]);
        // console.log(results[0].info.closedPnl);

    }
    let sum = 0;
    let numGainPnl = 0;
    let numLossPnl = 0;
    const outer_result = []
    results.forEach((result) => {
        // console.log(result)
        let pnl = Number(result.info.closedPnl);
        pnl = pnl <= -10 ? -10 : pnl;
        sum += Number(pnl);
        pnl > 0 ? numGainPnl++ : numLossPnl++;
        outer_result.push({ pnl, "pair": result.info.symbol, "start": moment.unix(result.timestamp / 1000).format(), "end": moment.unix(result.endTime / 1000).format() });

    })
    console.log(sum, numGainPnl, numLossPnl);
    return outer_result;
}

function reduceByKey(array, key) {
    return array.reduce((acc, curr) => {
        const value = curr[key];
        if (!acc[value]) {
            acc[value] = [];
        }
        acc[value].push(curr);
        return acc;
    }, {});
}

function mapSumByKey(value) {
    let sum = 0;
    value.forEach((v) => {
        sum += v.pnl;
    })
    return { ...value, "sum": sum };
}

async function main() {
    let delay = null;
    await import("delay").then((val) => { delay = val.default });
    results = await statistic();
    results = reduceByKey(results, "pair");
    Object.keys(results).map((r) => {
        let sum = 0;

        results[r].forEach((v) => {
            sum += v.pnl;
        })

        results[r] = { ...results[r], "sum": sum }
    })
    console.log(results);
    // await delay(5000);
    // results.forEach((r) => console.log(r));
    // console.log(asciichart.plot(results));
}

main();
