const config = {
    "tvsessionid": "zy3uyqjsxgoz0m6qc8ib5temuhn50whx",
    "tvsession_signature": "v2:QXLsqREIzx8YETlWLN/nydbDRIPKa07VALvP6tU53Sg=",
    "binanceapikey": "c8f19afe063d9ada608ad3c4f72ed0275397932ab01c098867b786d4267f7841",
    "binancesecret": "d2bb0fc9615325725498d98985867fa6d524ddfae8a12d4db3064155fc4e8786",
    "bybitapikey": "IWBxUtijPL9f8Lq0eT",
    "bybitsecret": "gGQLqDA473aXI9DUFQ9p0EDt6bwShnoQssCh"
}

const symbols = [
    "SOLUSDT",
    "1000PEPEUSDT",
    "XRPUSDT",
    "DOGEUSDT",
    "WIFUSDT",
    "NOTUSDT",
    "SHIB1000USDT",
    "LINKUSDT",
    "NEARUSDT",
    "LTCUSDT",
    "AVAXUSDT",
    "UNIUSDT",
    "ADAUSDT",
    "MATICUSDT",
    "TRXUSDT",
    "WLDUSDT",
    "RNDRUSDT",
    "OPUSDT",
    "ETCUSDT",
    "TONUSDT",
    "GALAUSDT",
    "ARUSDT",
    "GRTUSDT",
    "ICPUSDT",
    "PEOPLEUSDT",
    "BOMEUSDT"
];

const modes = [
    "forward",
    "forward",
    "forward",
    "forward",
    "forward",
    "forward",
    "forward",
    "backward",
    "forward",
    "forward",
    "forward",
    "backward",
    "forward",
    "forward",
    "backward",
    "backward",
    "forward",
    "forward",
    "forward",
    "forward",
    "forward",
    "forward",
    "forward",
    "forward",
    "forward",
    "backward",
    "forward"
];


exchange_str = "BYBIT";

timeframe_str = '1';

module.exports = {
    symbols,
    modes,
    config,
    exchange_str,
    timeframe_str
}