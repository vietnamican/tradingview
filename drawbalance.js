var asciichart = require('asciichart')
const fs = require('fs');
const csv = require('csv-parser');
const { range } = require('./utils');
const moment = require("moment");

async function loadDelay() {
    delay = null;
    await import("delay").then((val) => { delay = val.default });
    return delay;
}

async function main(file_path) {
    const delay = await loadDelay();
    const balances = await requiredata(file_path);
    await delay(5000);
    console.log(balances)
    console.log(asciichart.plot(balances.slice(0, 200)))
}

async function requiredata(file) {
    const balances = [];
    fs.createReadStream(file)
        .pipe(csv({
            header: [
                { id: 'time', title: 'time' },
                { id: 'balance', title: 'balance' }
            ]
        }))
        .on('data', async (row) => {
            balances.push(Number(row['balance']) / 1000);
        })
        .on('end', () => {
            // return balances;
            // console.log("Read successfully");
        });
    return balances
}

root = "D:/DataScience/TradingBot/tradingview/";

path = root +  "Systems/balance.csv"

main(path)


// var asciichart = require ('asciichart')
// var s0 = new Array (120)
// for (var i = 0; i < s0.length; i++)
//     s0[i] = 15 * Math.sin (i * ((Math.PI * 4) / s0.length))
// console.log (asciichart.plot (s0))
