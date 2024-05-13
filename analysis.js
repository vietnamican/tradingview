const ccxt = require("ccxt");
const { range } = require("./utils");

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

async function main() {
    bybit = await loadBybitTrading(config);
    const starttime = 1715472000000
    1715615844682
    const endtime = Date.now();
    step = 60 * 60 * 1000;
    const results = []
    // console.log(range(endtime, starttime, -step));
    const ranges = range(endtime, starttime, -step);
    for (let i = 0; i < ranges.length; i++) {
        const pieceoftimeend = ranges[i];
        const pieceoftimestart = pieceoftimeend - step;

        const result = await bybit.fetchPositionsHistory(symbol = "", pieceoftimestart, limit = 100, params = { "caterogy": "linear", "endTime": pieceoftimeend });
        results.push(...result);
        console.log(results.length);
        // console.log(results[0].info.closedPnl);

    }
    let sum = 0;
    let numGainPnl = 0;
    let numLossPnl = 0;
    results.forEach((result) => {
        // console.log(result.info.closePnL)
        const pnl = Number(result.info.closedPnl);
        sum += Number(result.info.closedPnl);
        pnl > 0 ? numGainPnl++ : numLossPnl++;
    })
    console.log(sum, numGainPnl, numLossPnl);
    // for (const pieceoftimeend in ranges) {
    //     console.log(pieceoftimeend);
    //     const pieceoftimestart = pieceoftimeend - step;
    //     console.log(pieceoftimestart, pieceoftimeend);

    //     const result = await bybit.fetchPositionsHistory(symbol = "", pieceoftimestart, limit = 100, params = { "caterogy": "linear", "endTime": pieceoftimeend });
    //     results.push(...result);
    //     console.log(results.length);
    // }
}

main();