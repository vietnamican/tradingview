const config = {
    "tvsessionid": "zy3uyqjsxgoz0m6qc8ib5temuhn50whx",
    "tvsession_signature": "v2:QXLsqREIzx8YETlWLN/nydbDRIPKa07VALvP6tU53Sg=",
    "binanceapikey": "c8f19afe063d9ada608ad3c4f72ed0275397932ab01c098867b786d4267f7841",
    "binancesecret": "d2bb0fc9615325725498d98985867fa6d524ddfae8a12d4db3064155fc4e8786",
    "bybitapikey": "IWBxUtijPL9f8Lq0eT",
    "bybitsecret": "gGQLqDA473aXI9DUFQ9p0EDt6bwShnoQssCh"
}

const pairs = [
    { symbol: 'SOLUSDT', mode: 'normal' },
    { symbol: '1000PEPEUSDT', mode: 'normal' },
    { symbol: 'XRPUSDT', mode: 'normal' },
    { symbol: 'DOGEUSDT', mode: 'normal' },
    { symbol: 'WIFUSDT', mode: 'normal' },
    { symbol: 'NOTUSDT', mode: 'inverse' },
    { symbol: 'SHIB1000USDT', mode: 'normal' },
    { symbol: 'LINKUSDT', mode: 'normal' },
    { symbol: 'NEARUSDT', mode: 'normal' },
    { symbol: 'LTCUSDT', mode: 'normal' },
    { symbol: 'AVAXUSDT', mode: 'normal' },
    { symbol: 'UNIUSDT', mode: 'normal' },
    { symbol: 'ADAUSDT', mode: 'normal' },
    { symbol: 'MATICUSDT', mode: 'normal' },
    { symbol: 'TRXUSDT', mode: 'normal' },
    { symbol: 'WLDUSDT', mode: 'normal' },
    // { symbol: 'RNDRUSDT', mode: 'normal' },
    { symbol: 'OPUSDT', mode: 'normal' },
    { symbol: 'ETCUSDT', mode: 'normal' },
    { symbol: 'TONUSDT', mode: 'inverse' },
    { symbol: 'GALAUSDT', mode: 'normal' },
    { symbol: 'ARUSDT', mode: 'normal' },
    { symbol: 'GRTUSDT', mode: 'normal' },
    { symbol: 'ICPUSDT', mode: 'normal' },
    { symbol: 'PEOPLEUSDT', mode: 'normal' },
    { symbol: 'BOMEUSDT', mode: 'normal' }
]


exchange_str = "BYBIT";

timeframe_str = '1';

module.exports = {
    pairs,
    config,
    exchange_str,
    timeframe_str
}