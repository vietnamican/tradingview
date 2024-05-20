const fs = require('fs');
const csv = require('csv-parser');
const { range } = require('../utils');
const moment = require("moment");


// Hàm tính toán EMA
function calculateEMA(prices, period) {
    const k = 2 / (period + 1);
    const ema = [];
    let prevEma = prices[0];

    ema[0] = prices[0];

    for (let i = 1; i < prices.length; i++) {
        prevEma = prices[i] * k + prevEma * (1 - k);
        ema[i] = prevEma;
    }

    return ema;
}

// Hàm tính toán RSI
function calculateRSIWithEMAAndWMA(prices, period = 14) {
    const gains = [];
    const losses = [];
    let avgGain = 0;
    let avgLoss = 0;

    // Tính toán gain và loss cho mỗi ngày
    for (let i = 1; i < prices.length; i++) {
        const gain = Math.max(prices[i] - prices[i - 1], 0);
        const loss = Math.max(prices[i - 1] - prices[i], 0);

        gains.push(gain);
        losses.push(loss);
    }

    // Tính toán average gain và average loss ban đầu
    avgGain = gains.slice(0, period).reduce((sum, gain) => sum + gain, 0) / period;
    avgLoss = losses.slice(0, period).reduce((sum, loss) => sum + loss, 0) / period;

    const rsi = [];
    const ema9Rsi = [];
    const wma45Rsi = [];

    // Tính toán RSI, EMA9 của RSI và WMA45 của RSI
    for (let i = period; i < prices.length; i++) {
        const gain = gains[i - 1];
        const loss = losses[i - 1];

        avgGain = (avgGain * (period - 1) + gain) / period;
        avgLoss = (avgLoss * (period - 1) + loss) / period;

        const rs = avgGain / avgLoss;
        const currentRSI = 100 - (100 / (1 + rs));

        rsi.push(currentRSI);

        // Tính toán EMA9 của RSI
        if (ema9Rsi.length < 9) {
            ema9Rsi.push(currentRSI);
        } else {
            const k = 2 / (9 + 1);
            const prevEma = ema9Rsi[ema9Rsi.length - 1];
            const newEma = (currentRSI - prevEma) * k + prevEma;
            ema9Rsi.push(newEma);
        }

        // Tính toán WMA45 của RSI
        if (wma45Rsi.length < 45) {
            wma45Rsi.push(currentRSI);
        } else {
            let sum = 0;
            for (let j = 0; j < 45; j++) {
                sum += (45 - j) * rsi[rsi.length - j - 1];
            }
            const newWma = sum / (45 * (45 + 1) / 2);
            wma45Rsi.push(newWma);
        }
    }

    return { rsi, ema9Rsi, wma45Rsi };
}

module.exports = class Data {
    chart_file = null;
    indicator_files = [];
    onUpdateList = [];
    indicators = {};
    chart = {};
    periods = [];
    constructor(chart_file) {
        this.chart_file = chart_file;
        this.chart.periods = [];
        this.indicators["TIENEMA"] = {};
        this.indicators["TIENEMA"].periods = [];
        this.indicators["TIENRSI"] = {};
        this.indicators["TIENRSI"].periods = [];
    }
    // default starttime = 1970 and endtime = 2077
    async load(starttime = 0, endtime = 3376728000) {
        console.log("wait");
        fs.createReadStream(chart_file)
            .pipe(csv({ headers: ['Timestamp', 'Open', 'High', "Low", "Close", "Volume"] }))
            .on('data', async (row) => {
                // console.log(Number(row["Timestamp"]) / 1000);
                if (Number(row["Timestamp"] / 1000) > starttime && Number(row["Timestamp"] / 1000) < endtime) {
                    this.chart.periods.push({
                        "time": row['Timestamp'],
                        "open": row['Open'],
                        "max": row['High'],
                        "min": row['Low'],
                        "close": row['Close'],
                        "volume": row['Volume']
                    })
                }
                // await this.update();
                // console.log(row);
            })
            .on('end', () => {
                console.log('Read end');
                const closes = [];
                this.chart.periods.forEach((period) => {
                    closes.push(period['close']);
                })
                console.log(closes.length);
                const currentema = {};
                currentema['5'] = calculateEMA(closes, 5);
                console.log(currentema['5'].length);
                currentema['10'] = calculateEMA(closes, 10);
                currentema['20'] = calculateEMA(closes, 20);
                currentema['50'] = calculateEMA(closes, 50);
                currentema['100'] = calculateEMA(closes, 100);
                currentema['200'] = calculateEMA(closes, 200);
                const { rsi, ema9Rsi, wma45Rsi } = calculateRSIWithEMAAndWMA(closes);
                const currentrsi = {};
                currentrsi['RSI'] = rsi;
                currentrsi['RSIbased_MA'] = ema9Rsi;
                currentrsi['RSIbased_MA_2'] = wma45Rsi;
                const rsi_period = 14;
                for (const i in range(0, this.chart.periods.length, 1)) {
                    this.indicators['TIENEMA'].periods.push({
                        "time": moment.unix(Number(this.chart.periods[i]["time"] / 1000)).format(),
                        "5": currentema["5"][i],
                        "10": currentema["10"][i],
                        "20": currentema["20"][i],
                        "50": currentema["50"][i],
                        "100": currentema["100"][i],
                        "200": currentema["200"][i],
                    });
                    if (i >= rsi_period) {
                        this.indicators['TIENRSI'].periods.push({
                            "time": moment.unix(Number(this.chart.periods[i]["time"] / 1000)).format(),
                            "RSI": currentrsi["RSI"][i - rsi_period],
                            "RSIbased_MA": currentrsi['RSIbased_MA'][i - rsi_period],
                            "RSIbased_MA_2": currentrsi['RSIbased_MA_2'][i - rsi_period]
                        })
                    } else {
                        this.indicators['TIENRSI'].periods.push({
                            "time": moment.unix(Number(this.chart.periods[i]["time"] / 1000)).format(),
                            "RSI": 50,
                            "RSIbased_MA": 50,
                            "RSIbased_MA_2": 50
                        })
                    }
                }
                console.log(this.indicators['TIENEMA'].periods.length);
            });
    }
}

