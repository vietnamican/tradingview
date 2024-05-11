const { Client } = require('@mathieuc/tradingview');
const TradingView = require('@mathieuc/tradingview');

/**
 * This example tests the fake replay mode which
 * works in intraday even with free plan
 */

console.log('----- Testing FakeReplayMode: -----');
delay = null;
import("delay").then((val) => { delay = val.default });
const config = {
    "tvsessionid": "zy3uyqjsxgoz0m6qc8ib5temuhn50whx",
    "tvsession_signature": "v2:QXLsqREIzx8YETlWLN/nydbDRIPKa07VALvP6tU53Sg=",
    "binanceapikey": "c8f19afe063d9ada608ad3c4f72ed0275397932ab01c098867b786d4267f7841",
    "binancesecret": "d2bb0fc9615325725498d98985867fa6d524ddfae8a12d4db3064155fc4e8786",
    "bybitapikey": "IWBxUtijPL9f8Lq0eT",
    "bybitsecret": "gGQLqDA473aXI9DUFQ9p0EDt6bwShnoQssCh"
}

const client = new Client({
    token: config.tvsessionid,
    signature: config.tvsession_signature,
});
const chart = new client.Session.Chart();

chart.setMarket('BYBIT:NEARUSDT.P', {
    timeframe: '1',
    range: 1, // Range is negative, so 'to' means 'from'
    from: Math.round(Date.now() / 1000) - 86400 * 7, // Seven days before now
    to: Math.round(Date.now() / 1000),
});
const indicators = {};
async function loadPrivateIndicators(config, chart) {

    indicList = await TradingView.getPrivateIndicators(config.tvsessionid);
    await indicList.forEach(async (indic) => {
        const privateIndic = await indic.get();
        console.log(`Indicator ${indic.name} loading...`)

        const indicator = new chart.Study(privateIndic);

        indicator.onReady(() => {
            indicators[indic.name] = indicator;
            // console.log(`Indicator ${indic.name} for ${exchange_str}:${symbol_str} loaded!`);
        });
    });
    await delay(2000);
}
loadPrivateIndicators(config, chart);


let interval = NaN;

chart.onUpdate(async () => {
    console.log(chart.periods.length);
    const times = chart.periods.map((p) => p.time);

    const intrval = times[0] - times[1];
    if (Number.isNaN(interval) && times.length >= 2) interval = intrval;

    if (!Number.isNaN(interval) && interval !== intrval) {
        throw new Error(`Wrong interval: ${intrval} (should be ${interval})`);
    }

    console.log('Next ->', times[chart.periods.length-1]);
    console.log(Math.round(Date.now() / 1000) - 86400 * 7);

    if ((times[chart.periods.length-1] - 100*60) <= Math.round(Date.now() / 1000) - 86400 * 7) {
        await client.end();
        console.log('Done !', times.length);
    }

    chart.fetchMore(1);
});