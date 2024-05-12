const TradingSystem = require("./FakeReplay");

chart_file = "D:\\DataScience\\TradingBot\\Data\\1h\\GRTUSDT.txt";
indicator_files = [

]
const tradingSystem = new TradingSystem(chart_file, indicator_files);
tradingSystem.load(chart_file);