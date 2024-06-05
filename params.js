const config = {
    "tvsessionid": "zy3uyqjsxgoz0m6qc8ib5temuhn50whx",
    "tvsession_signature": "v2:QXLsqREIzx8YETlWLN/nydbDRIPKa07VALvP6tU53Sg=",
    "binanceapikey": "c8f19afe063d9ada608ad3c4f72ed0275397932ab01c098867b786d4267f7841",
    "binancesecret": "d2bb0fc9615325725498d98985867fa6d524ddfae8a12d4db3064155fc4e8786",
    "bybitapikey": "IWBxUtijPL9f8Lq0eT",
    "bybitsecret": "gGQLqDA473aXI9DUFQ9p0EDt6bwShnoQssCh"
}

const pairs = [
    { symbol: 'SOLUSDT', mode: 'inverse' },
    { symbol: '1000PEPEUSDT', mode: 'inverse' },
    { symbol: 'XRPUSDT', mode: 'inverse' },
    { symbol: 'DOGEUSDT', mode: 'inverse' },
    { symbol: 'WIFUSDT', mode: 'inverse' },
    { symbol: 'NOTUSDT', mode: 'inverse' },
    { symbol: 'SHIB1000USDT', mode: 'inverse' },
    { symbol: 'LINKUSDT', mode: 'inverse' },
    { symbol: 'NEARUSDT', mode: 'inverse' },
    { symbol: 'LTCUSDT', mode: 'inverse' },
    { symbol: 'AVAXUSDT', mode: 'inverse' },
    { symbol: 'UNIUSDT', mode: 'inverse' },
    { symbol: 'ADAUSDT', mode: 'inverse' },
    { symbol: 'MATICUSDT', mode: 'inverse' },
    { symbol: 'TRXUSDT', mode: 'inverse' },
    { symbol: 'WLDUSDT', mode: 'inverse' },
    { symbol: 'RNDRUSDT', mode: 'inverse' },
    { symbol: 'OPUSDT', mode: 'inverse' },
    { symbol: 'ETCUSDT', mode: 'inverse' },
    { symbol: 'TONUSDT', mode: 'inverse' },
    { symbol: 'GALAUSDT', mode: 'inverse' },
    { symbol: 'ARUSDT', mode: 'inverse' },
    { symbol: 'GRTUSDT', mode: 'inverse' },
    { symbol: 'ICPUSDT', mode: 'inverse' },
    { symbol: 'PEOPLEUSDT', mode: 'inverse' },
    { symbol: 'BOMEUSDT', mode: 'inverse' }
]


exchange_str = "BYBIT";

timeframe_str = '1';

module.exports = {
    pairs,
    config,
    exchange_str,
    timeframe_str
}