const TradingView = require('@mathieuc/tradingview');
const ccxt = require("ccxt");
const TradingSystem = require("./Systems/SystemReplay");
const Data = require("./Systems/Data");



// chart_file = "D:\\DataScience\\TradingBot\\Data\\1mm\\GRTUSDT.txt";
chart_file = "D:\\DataScience\\TradingBot\\Data\\1mm\\LINKUSDT.txt";
// chart_file = "D:\\DataScience\\TradingBot\\Data\\15m\\MATICUSDT.txt";
// chart_file = "D:\\DataScience\\TradingBot\\Data\\15m\\NEARUSDT.txt";
// chart_file = "D:\\DataScience\\TradingBot\\Data\\15m\\OCEANUSDT.txt";
// chart_file = "D:\\DataScience\\TradingBot\\Data\\15m\\OMNIUSDT.txt";
// chart_file = "D:\\DataScience\\TradingBot\\Data\\15m\\RNDRUSDT.txt";
// chart_file = "D:\\DataScience\\TradingBot\\Data\\15m\\SSVUSDT.txt";
// chart_file = "D:\\DataScience\\TradingBot\\Data\\15m\\WLDUSDT.txt";
async function main(){
    let delay = null;
    await import("delay").then((val) => { delay = val.default });

    const starttime = 1704110400
    const endtime = 3376728000
    const data = new Data(chart_file);
    await data.load(starttime, endtime);
    await delay(5000);
    
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