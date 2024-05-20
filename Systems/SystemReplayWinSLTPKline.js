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
SEEKING_CUTDOWN = 3;
SEEKING_CUTUP = 4;

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
    tvtime = [];
    tvopen = [];
    tvhigh = [];
    tvlow = [];
    tvclose = [];
    tvvolume = [];
    qty = 0;
    price = 0;
    precision = 1;
    loop = [1, 2, 3];
    finished = false;
    usdt = 50000;

    // mode: forward or replay
    constructor(exchange_str, exchange, symbol_str, timeframe_str, chart, indicators, options) {
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
        this.options = options;
        this.debug = true;
        this.init();
        this.tvindicator = {};
        this.tvindicator["TIENEMA"] = []
        this.tvindicator["TIENRSI"] = []

        // axios.get(`https://api-testnet.bybit.com/v5/market/instruments-info?category=linear&symbol=${this.symbol_str}`).then(res => {
        //     this.qtyStep = res.data.result.list[0].lotSizeFilter.qtyStep;
        // });
    }
    init() {
        if (!this.options) {
            this.options = {}
        }
        if (!this.options.sl) {
            this.options.sl = 0.002;
        }
        if (!this.options.tp) {
            this.options.tp = 0.002;
        }
        if (!this.options.kline_ratio) {
            this.options.kline_ratio = 2;
        }
        if (!this.options.history_length) {
            this.options.history_length = 10;
        }
    }
    async updateStatus(i) {
        this.tvtime.unshift(this.chart.periods[i].time);
        this.tvopen.unshift(this.chart.periods[i].open);
        this.tvhigh.unshift(this.chart.periods[i].high);
        this.tvlow.unshift(this.chart.periods[i].low);
        this.tvclose.unshift(this.chart.periods[i].close);
        this.tvvolume.unshift(this.chart.periods[i].volume);

        this.tvtime.splice(this.options.history_length);
        this.tvopen.splice(this.options.history_length);
        this.tvhigh.splice(this.options.history_length);
        this.tvlow.splice(this.options.history_length);
        this.tvclose.splice(this.options.history_length);
        this.tvvolume.splice(this.options.history_length);

        this.tvindicator["TIENEMA"].unshift(this.indicators["TIENEMA"].periods[i]);
        this.tvindicator["TIENRSI"].unshift(this.indicators["TIENRSI"].periods[i]);

        this.tvindicator["TIENEMA"].splice(this.options.history_length);
        this.tvindicator["TIENRSI"].splice(this.options.history_length);

        // if (this.debug) {
        //     if (this.tvtime >= 1704155040000 && this.tvtime <= 1704157860000) {
        //         console.log(`Price ${this.tvclose}`);
        //     }
        // }

        if (isWholeDay(Number(this.tvtime[0]))) {
            const balance = this.balance();
            this.balance_logs.push({ "time": this.tvtime[0], "balance": balance });
        }
    }
    async start() {
        await import("delay").then((val) => { this.delay = val.default })
        const chart = this.chart;
        for (let i = 0; i < chart.periods.length; i++) {
            if (i >= 14) {
                this.updateStatus(i);
                this.trade();
            }
        }
        await this.write_balance();
        await this.write_pnl();
    }

    trade() {
        switch (this.current_action) {
            case STAND:
                this.takePosition();
                break;
            case LONG:
                this.sltplong();
                break;
            case SHORT:
                this.sltpshort();
                break;
            case SEEKING_CUTDOWN:
                this.seekingcutdown();
                break;
            case SEEKING_CUTUP:
                this.seekingcutup();
                break;
        }
    }

    takePosition() {
        const closes = this.tvclose;
        const opens = this.tvopen;
        const current_ema = this.tvindicator["TIENEMA"][0];
        const e5 = current_ema['5'];
        const e10 = current_ema['10'];
        const e20 = current_ema['20'];
        const e50 = current_ema['50'];
        const e100 = current_ema['100'];
        const e200 = current_ema['200'];
        const current_rsi = this.tvindicator["TIENRSI"][0];
        const rsi = current_rsi["RSI"]
        const rsi_fast = current_rsi["RSIbased_MA"];
        const rsi_slow = current_rsi["RSIbased_MA_2"];

        // Check long
        const long_ema_condition = closes[0] > e5 && e5 > e10 && e10 > e20 && e20 > e50 && e50 > e100 && e100 > e200;
        const long_rsi_condition = rsi > 70;
        const long_kline_condition = () => {
            const current_body = closes[0] - opens[0];
            // kline rise
            if (current_body > 0) {
                // take up to 5 previous klines
                const length = Math.min(5, this.tvclose.length - 1);
                console.log("Start Long Kline condition check")
                console.log("0: " + current_body)
                let previous_body = 0;
                for (let i = 1; i <= length; i++) {
                    previous_body += Math.abs(closes[i] - opens[i]);
                    console.log(i + ": " + Math.abs(closes[i] - opens[i]))
                }
                const previous_body_avg = previous_body / length;
                console.log("avg: ", previous_body_avg);
                console.log("rsi: ", rsi);
                console.log(closes[0], e5, e10, e20, e50, e100, e200);
                return current_body >= this.options.kline_ratio * previous_body_avg;
            }
            return false;
        }
        // console.log("Long Kline condition " + long_kline_condition());
        if (long_ema_condition && long_rsi_condition && long_kline_condition()) {
            // if (long_ema_condition && long_rsi_condition) {
            this.current_action = SHORT;
            console.log("---------------------------------------")
            console.log("Short")
            this.short();
            return;
        }

        // Check short
        const short_ema_condition = closes[0] < e5 && e5 < e10 && e10 < e20 && e20 < e50 && e50 < e100 && e100 < e200;
        const short_rsi_condition = rsi < 30;
        const short_kline_condition = () => {
            const current_body = closes[0] - opens[0];
            // kline fall
            if (current_body < 0) {
                // take up to 5 previous klines
                const length = Math.min(5, this.tvclose.length - 1);
                let previous_body = 0;
                for (let i = 1; i <= length; i++) {
                    previous_body += Math.abs(closes[i] - opens[i]);
                }
                const previous_body_avg = previous_body / length;
                return current_body >= this.options.kline_ratio * previous_body_avg;
            }
            return false;
        }
        // console.log("Short Kline condition " + short_kline_condition());
        if (short_ema_condition && short_rsi_condition && short_kline_condition()) {
            // if (short_ema_condition && short_rsi_condition) {
            this.current_action = LONG;
            console.log("---------------------------------------")
            console.log("Long")
            this.long();
            return;
        }
        return;
    }

    sltplong() {
        const closes = this.tvclose;
        const opens = this.tvopen;
        const sl = this.sl_price;
        const tp = this.tp_price;
        const current_ema = this.tvindicator["TIENEMA"][0];
        const e5 = current_ema['5'];
        const e10 = current_ema['10'];
        const e20 = current_ema['20'];
        const e50 = current_ema['50'];
        const e100 = current_ema['100'];
        const e200 = current_ema['200'];
        const current_rsi = this.tvindicator["TIENRSI"][0];
        const rsi = current_rsi["RSI"]
        const rsi_fast = current_rsi["RSIbased_MA"];
        const rsi_slow = current_rsi["RSIbased_MA_2"];

        // sl
        if (closes[0] < sl) {
            console.log("SL Long");
            console.log(`[${moment.unix(this.tvtime[0] / 1000)}] ${this.tvtime[0]} SL Long with price ${closes[0]} and threshold ${sl}`)
            this.liquidlong();
            this.current_action = SEEKING_CUTUP;
            return;
        }
        // tp
        if (closes[0] > tp) {
            console.log("TP Long")
            console.log(`[${moment.unix(this.tvtime[0] / 1000)}] ${this.tvtime[0]} TP Long with price ${closes[0]} and threshold ${tp}`)
            this.liquidlong();
            this.current_action = SEEKING_CUTUP;
            return;
        }
        //close
        if (e5 > e10) {
            console.log("CLOSE Long")
            this.liquidlong();
            this.current_action = STAND;
            return;
        }
    }

    sltpshort() {
        const closes = this.tvclose;
        const opens = this.tvopen;
        const sl = this.sl_price;
        const tp = this.tp_price;
        const current_ema = this.tvindicator["TIENEMA"][0];
        const e5 = current_ema['5'];
        const e10 = current_ema['10'];
        const e20 = current_ema['20'];
        const e50 = current_ema['50'];
        const e100 = current_ema['100'];
        const e200 = current_ema['200'];
        const current_rsi = this.tvindicator["TIENRSI"][0];
        const rsi = current_rsi["RSI"]
        const rsi_fast = current_rsi["RSIbased_MA"];
        const rsi_slow = current_rsi["RSIbased_MA_2"];

        // sl
        if (closes[0] > sl) {
            console.log("SL Short")
            console.log(`[${moment.unix(this.tvtime[0] / 1000)}] ${this.tvtime[0]} SL Short with price ${closes[0]} and threshold ${sl}`)
            this.liquidshort();
            this.current_action = SEEKING_CUTDOWN;
            return;
        }
        // tp
        if (closes[0] < tp) {
            console.log("TP Short")
            console.log(`[${moment.unix(this.tvtime[0] / 1000)}] ${this.tvtime[0]} TP Short with price ${closes[0]} and threshold ${tp}`)
            this.liquidshort();
            this.current_action = SEEKING_CUTDOWN;
            return;
        }
        //close
        if (e5 < e10) {
            console.log("CLOSE Short")
            this.liquidshort();
            this.current_action = STAND;
            return;
        }
    }

    seekingcutdown() {
        const current_ema = this.tvindicator["TIENEMA"][0];
        const e5 = current_ema['5'];
        const e10 = current_ema['10'];

        // exit seeking
        if (e5 < e10) {
            this.current_action = STAND;
        }
    }

    seekingcutup() {
        const current_ema = this.tvindicator["TIENEMA"][0];
        const e5 = current_ema['5'];
        const e10 = current_ema['10'];

        // exit seeking
        if (e5 > e10) {
            this.current_action = STAND;
        }
    }

    async long() {
        const time = this.tvtime[0];
        const amount = 50000; // 100 USDT
        const price = this.tvclose[0];
        const qty = this.round(amount / price);
        const sl_price = price * (1 - this.options.sl);
        const tp_price = price * (1 + this.options.tp);

        console.log(`[${moment.unix(time / 1000).format()}] ${this.tvtime[0]} Buy ${qty} ${this.symbol_str} with price ${price}`);

        this.record('buy', price, qty);
        this.qty = qty;
        this.price = price;
        this.sl_price = sl_price;
        this.tp_price = tp_price;
    }

    async liquidlong() {
        const time = this.tvtime[0];
        const qty = this.qty;
        const price = this.tvclose[0];
        this.record_pnl(qty, LONG, this.price, price);

        console.log(`[${moment.unix(time / 1000).format()}] ${this.tvtime[0]} Liquid buy ${qty} ${this.symbol_str} with price ${price}`);

        this.record('sell', price, qty);
        this.price = 0;
        this.qty = 0;
    }

    short() {
        const time = this.tvtime[0];
        const amount = 50000; // 100 USDT
        const price = this.tvclose[0];
        const qty = this.round(amount / price);
        const sl_price = price * (1 + this.options.sl);
        const tp_price = price * (1 - this.options.tp);

        console.log(`[${moment.unix(time / 1000).format()}] ${this.tvtime[0]} Sell ${qty} ${this.symbol_str} with price ${price}`);

        this.record('sell', price, qty);
        this.qty = qty;
        this.price = price;
        this.sl_price = sl_price;
        this.tp_price = tp_price;
    }

    async liquidshort() {
        const time = this.tvtime[0];
        const qty = this.qty;
        const price = this.tvclose[0];
        this.record_pnl(qty, SHORT, this.price, price);

        console.log(`[${moment.unix(time / 1000).format()}] ${this.tvtime[0]} Liquid sell ${qty} ${this.symbol_str} with price ${price}`);

        this.record('buy', price, qty);
        this.qty = 0;
        this.price = 0;
    }
    record_pnl(qty, action, first_price, second_price) {
        let pnl = 0;
        if (action === LONG) {
            pnl = (second_price - first_price) * qty;
        } else if (action == SHORT) {
            pnl = (first_price - second_price) * qty;
        }
        console.log(`[${moment.unix(this.tvtime[0] / 1000).format()}] ${this.tvtime[0]} PNL: ${pnl}`)
        this.pnl_logs.push({ "time": this.tvtime[0], "pnl": pnl });
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
        console.log(`[${moment.unix(this.tvtime[0] / 1000).format()}] ${this.tvtime[0]} Your balance is ${total}`);
        return total;
    }

    async write_balance() {
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
    }

    async write_pnl() {
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
}