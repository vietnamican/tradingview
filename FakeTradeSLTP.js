const TradingView = require('@mathieuc/tradingview');
const ccxt = require("ccxt");
const TradingSystem = require("./Systems/SystemReplayWinSLTPKline");
const Data = require("./Systems/Data");
const fs = require('fs');
const path = require('path');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;



// root = "D:/DataScience/TradingBot/Data/";
root = "/home/xltt/TradingBot/Data/"

// chart_file = root + "1mm/GRTUSDT.txt";
// chart_file = root + "1mm/LINKUSDT.txt";
// chart_file = root + "1mm/MATICUSDT.txt";
chart_file = root + "1mm/NEARUSDT.txt";
// chart_file = root + "1mm/OCEANUSDT.txt";
// chart_file = root + "1mm/OMNIUSDT.txt";
// chart_file = root + "1mm/RNDRUSDT.txt";
// chart_file = root + "1mm/SSVUSDT.txt";
// chart_file = root + "1mm/WLDUSDT.txt";
async function main() {
    let delay = null;
    await import("delay").then((val) => { delay = val.default });

    const starttime = 1704110400
    const endtime = 3376728000
    const data = new Data(chart_file);
    await data.load(starttime, endtime);
    await delay(5000);

    // write EMA
    const ema_file = path.join(__dirname, "ema.csv");
    csvWriter = createCsvWriter({
        path: ema_file,
        header: [
            { id: 'time', title: 'time' },
            { id: '5', title: '5' },
            { id: '10', title: '10' },
            { id: '20', title: 'high' },
            { id: '50', title: 'low' },
            { id: '100', title: 'close' },
            { id: '200', title: 'volume' },
        ]
    });
    csvWriter
        .writeRecords(data.indicators['TIENEMA'].periods)
        .then(() => console.log('Write csv file successfully'))
        .catch((error) => console.error(error));


    // write EMA
    const rsi_file = path.join(__dirname, "rsi.csv");
    csvWriter = createCsvWriter({
        path: rsi_file,
        header: [
            { id: 'time', title: 'time' },
            { id: 'RSI', title: 'rsi' },
            { id: 'RSIbased_MA', title: 'fast' },
            { id: 'RSIbased_MA_2', title: 'low' }
        ]
    });
    csvWriter
        .writeRecords(data.indicators['TIENRSI'].periods)
        .then(() => console.log('Write csv file successfully'))
        .catch((error) => console.error(error));

    console.log("Load data done!");

    const exchange_str = 'BYBIT';
    const symbol_str = "GRTUSDT";
    const timeframe_str = "1h";
    const chart = data.chart;
    const indicators = data.indicators;

    const system = new TradingSystem(exchange_str, undefined, symbol_str, timeframe_str, chart, indicators);
    system.start();
}

main();