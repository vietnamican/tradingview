const moment = require("moment");
const axios = require("axios");
const { isWholeDay, isWholeMinute } = require("../utils");
const fs = require('fs');
const path = require('path');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const LONG = 0;
const SHORT = 1;
const STAND = 2;
const LIQUID = 1;
const FREE = 2;

async function loadDelay() {
    delay = null;
    await import("delay").then((val) => { delay = val.default });
    return delay;
}

module.exports = class TradingSystem {
    exchange_str = "";
    exchange = null;
    chart = null;
    symbol_str = "";
    timeframe_str = "";
    indicators = {};
    current_action;
    lasttime = -1;
    tvtime = -1;
    tvopen = -1;
    tvhigh = -1;
    tvlow = -1;
    tvclose = -1;
    tvvolume = -1;
    qty = 0;
    price = 0;
    precision = 1;
    loop = [1, 2, 3];
    finished = false;
    usdt = 50000;


    // mode: forward or replay
    constructor(exchange_str, exchange, symbol_str, timeframe_str, chart, indicators) {
        this.exchange_str = exchange_str;
        this.exchange = exchange;
        this.chart = chart;
        this.symbol_str = symbol_str;
        this.timeframe_str = timeframe_str;
        this.indicators = indicators;
        this.current_action = STAND;
        this.current_status = FREE;
        this.qtyStep = 0.1;
        this.balance_logs = [];
        this.pnl_logs = [];
        console.log(__dirname);

        // axios.get(`https://api-testnet.bybit.com/v5/market/instruments-info?category=linear&symbol=${this.symbol_str}`).then(res => {
        //     this.qtyStep = res.data.result.list[0].lotSizeFilter.qtyStep;
        // });
    }

    async updateStatus(i) {
        this.tvtime = this.chart.periods[i].time
        this.tvopen = this.chart.periods[i].open
        this.tvhigh = this.chart.periods[i].max
        this.tvlow = this.chart.periods[i].min
        this.tvclose = this.chart.periods[i].close
        this.tvvolume = this.chart.periods[i].volume
        this.tvindicator = {}
        this.tvindicator["TIENEMA"] = this.indicators["TIENEMA"].periods[i];
        this.tvindicator["TIENRSI"] = this.indicators["TIENRSI"].periods[i];
        // console.log(this.tvtime);
        const date = new Date(Number(this.tvtime));
        // console.log(date);
        // console.log(`${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`)
        if (isWholeDay(Number(this.tvtime))) {
            const balance = this.balance();
            console.log(balance);
            this.balance_logs.push({ "time": this.tvtime, "balance": balance });
            // const row = {"time": this.tvtime, "balance": balance}
            // console.log(balance);
            // await this.csvWriter
            //     .writeRecords([row])
            //     .catch((error) => console.error(error));
        }
    }
    async start() {
        await import("delay").then((val) => { this.delay = val.default })
        const chart = this.chart;
        for (let i = 0; i < chart.periods.length; i++) {
            if (i >= 14) {
                // console.log(i);
                this.updateStatus(i);
                // console.log(`[${moment.unix(this.tvtime / 1000).format()}] ${this.exchange_str}:${this.symbol_str} Open:${this.tvopen} High:${this.tvhigh} Low:${this.tvlow} Close:${this.tvclose} Volume:${this.tvvolume}`);
                this.trade();
                // await this.delay(100);
            }
        }
        const balance_file = path.join(__dirname, "balance.csv");
        const balance_csvWriter = createCsvWriter({
            path: balance_file,
            header: [
                { id: 'time', title: 'time' },
                { id: 'balance', title: 'balance' }
            ]
        });
        await balance_csvWriter
            .writeRecords(this.balance_logs)
            .catch((error) => console.error(error));

        const pnl_file = path.join(__dirname, "pnl.csv");
        const pnl_csvWriter = createCsvWriter({
            path: pnl_file,
            header: [
                { id: 'time', title: 'time' },
                { id: 'pnl', title: 'pnl' }
            ]
        });
        await pnl_csvWriter
            .writeRecords(this.pnl_logs)
            .catch((error) => console.error(error));
    }

    trade() {
        // if (this.lasttime === -1 || this.tvtime === -1 || this.tvopen === -1 || this.tvhigh === -1 || this.tvlow === -1 || this.tvclose === -1 || this.tvvolume === -1) {
        //     return;
        // }
        if (this.current_action === STAND) {
            this.longshot();
            return;
        } else if (this.current_action == LONG) {
            this.freelong();
            return;
        } else if (this.current_action == SHORT) {
            this.freeshort();
            return;
        }
    }

    longshot() {
        const close = this.tvclose;
        const current_ema = this.tvindicator["TIENEMA"];
        const e5 = current_ema['5'];
        const e10 = current_ema['10'];
        const e20 = current_ema['20'];
        const e50 = current_ema['50'];
        const e100 = current_ema['100'];
        const e200 = current_ema['200'];
        const current_rsi = this.tvindicator["TIENRSI"];
        const rsi = current_rsi["RSI"]
        const rsi_fast = current_rsi["RSIbased_MA"];
        const rsi_slow = current_rsi["RSIbased_MA_2"];

        // Check long
        const long_ema_condition = close > e5 && e5 > e10 && e10 > e20 && e20 > e50 && e50 > e100 && e100 > e200;
        const long_rsi_condition = rsi > 70;
        if (long_ema_condition && long_rsi_condition) {
            this.current_action = LONG;
            this.take_trade();
            return;
        }

        // Check short
        const short_ema_condition = close < e5 && e5 < e10 && e10 < e20 && e20 < e50 && e50 < e100 && e100 < e200;
        const short_rsi_condition = rsi < 30;
        if (short_ema_condition && short_rsi_condition) {
            this.current_action = SHORT;
            this.take_trade();
            return;
        }
        return;
    }

    freelong() {
        const close = this.tvclose;
        const current_ema = this.tvindicator["TIENEMA"];
        const e5 = current_ema['5'];
        const e10 = current_ema['10'];
        const e20 = current_ema['20'];
        const e50 = current_ema['50'];
        const e200 = current_ema['200'];
        const current_rsi = this.tvindicator["TIENRSI"];
        const rsi = current_rsi["RSI"]
        const rsi_fast = current_rsi["RSIbased_MA"];
        const rsi_slow = current_rsi["RSIbased_MA_2"];
        if (e5 < e10) {
            this.current_status = LIQUID;
            this.take_trade();
        }
    }

    freeshort() {
        const close = this.tvclose;
        const current_ema = this.tvindicator["TIENEMA"];
        const e5 = current_ema['5'];
        const e10 = current_ema['10'];
        const e20 = current_ema['20'];
        const e50 = current_ema['50'];
        const e200 = current_ema['200'];
        const current_rsi = this.tvindicator["TIENRSI"];
        const rsi = current_rsi["RSI"]
        const rsi_fast = current_rsi["RSIbased_MA"];
        const rsi_slow = current_rsi["RSIbased_MA_2"];
        if (e5 > e10) {
            this.current_status = LIQUID;
            this.take_trade();
        }
    }

    take_trade() {
        // depend on current_action and current_status
        // for STAND and LIQUID v
        // for STAND and FREE v
        // for LONG and LIQUID v
        // for LONG and FREE v
        // for SHORT and LIQUID v
        // for SHORT and FREE v
        if (this.current_action === STAND && this.current_status === LIQUID) {
            // never reach it
        } else if (this.current_action === STAND && this.current_status === FREE) {
            // never reach it
        } else if (this.current_action === LONG && this.current_status === LIQUID) {
            this.current_action = STAND;
            this.current_status = FREE;
            this.liquidbuy();
            this.balance();
        } else if (this.current_action === LONG && this.current_status === FREE) {
            this.buy();
            this.balance();
        } else if (this.current_action === SHORT && this.current_status === LIQUID) {
            this.current_action = STAND;
            this.current_status = FREE;
            this.liquidsell();
            this.balance();
        } else if (this.current_action === SHORT && this.current_status === FREE) {
            this.sell();
            this.balance();
        }
    }

    async buy() {
        const amount = 50000; // 100 USDT
        const price = this.tvclose;
        const qty = this.round(amount / price);

        console.log(`Buy ${qty} ${this.symbol_str} with price ${price}`);

        this.record('buy', price, qty);
        this.qty = qty;
        this.price = price;
    }

    async liquidbuy() {
        const qty = this.qty;
        const price = this.tvclose;
        this.record_pnl(qty, LONG, this.price, price);

        console.log(`Liquid buy ${qty} ${this.symbol_str} with price ${price}`);

        this.record('sell', price, qty);
        this.price = 0;
        this.qty = 0;
    }

    sell() {
        const amount = 50000; // 100 USDT
        const price = this.tvclose;
        const qty = this.round(amount / price);

        console.log(`Sell ${qty} ${this.symbol_str} with price ${price}`);

        this.record('sell', price, qty);
        this.qty = qty;
        this.price = price;
    }

    async liquidsell() {
        const qty = this.qty;
        const price = this.tvclose;
        this.record_pnl(qty, SHORT, this.price, price);

        console.log(`Liquid sell ${qty} ${this.symbol_str} with price ${price}`);

        this.record('buy', price, qty);
        this.qty = qty;
        this.price = price;
    }
    record_pnl(qty, action, first_price, second_price) {
        let pnl = 0;
        if (action === LONG) {
            pnl = (second_price - first_price) * qty;
        } else if (action == SHORT) {
            pnl = (first_price - second_price) * qty;
        }
        this.pnl_logs.push({ "time": this.tvtime, "pnl": pnl });
    }

    round(number) {
        return Math.round(number / this.qtyStep) * this.qtyStep;
    }

    record(action, price, qty) {
        if (action === 'buy') {
            this.usdt -= price * qty;
        } else if (action == 'sell') {
            this.usdt += price * qty;
        }
    }

    balance() {
        let total = 0;
        if (this.current_action == LONG) {
            total = this.usdt + this.price * this.qty;
            total -= this.price * this.qty * 0.055 / 100;
        } else if (this.current_action == SHORT) {
            total = this.usdt - this.price * this.qty;
            total -= this.price * this.qty * 0.055 / 100;
        } else {
            total = this.usdt;
        }
        console.log(`[${moment.unix(this.tvtime / 1000).format()}] Your balance is ${total}`);
        return total;
    }
}