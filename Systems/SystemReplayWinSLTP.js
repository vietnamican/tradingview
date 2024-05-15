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
        this.init();

        // axios.get(`https://api-testnet.bybit.com/v5/market/instruments-info?category=linear&symbol=${this.symbol_str}`).then(res => {
        //     this.qtyStep = res.data.result.list[0].lotSizeFilter.qtyStep;
        // });
    }
    init() {
        if (!this.options) {
            this.options = {}
        }
        if (!this.options.sl) {
            this.options.sl = 0.003;
        }
        if (!this.options.tp) {
            this.options.tp = 0.006;
        }
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

        if (isWholeDay(Number(this.tvtime))) {
            const balance = this.balance();
            console.log(balance);
            this.balance_logs.push({ "time": this.tvtime, "balance": balance });
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
            this.current_action = SHORT;
            this.short();
            return;
        }

        // Check short
        const short_ema_condition = close < e5 && e5 < e10 && e10 < e20 && e20 < e50 && e50 < e100 && e100 < e200;
        const short_rsi_condition = rsi < 30;
        if (short_ema_condition && short_rsi_condition) {
            this.current_action = LONG;
            this.long();
            return;
        }
        return;
    }

    sltplong() {
        const close = this.tvclose;
        const sl = this.sl;
        const tp = this.tp;
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

        // sl
        if (close < sl) {
            console.log("SL Long")
            this.liquidlong();
            this.current_action = SEEKING_CUTUP;
            return;
        }
        // tp
        if (close > tp) {
            console.log("TP Long")
            this.liquidlong();
            this.current_status = SEEKING_CUTUP;
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
        const close = this.tvclose;
        const sl = this.sl;
        const tp = this.tp;
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

        // sl
        if (close > sl) {
            console.log("SL Short")
            this.liquidshort();
            this.current_action = SEEKING_CUTDOWN;
            return;
        }
        // tp
        if (close < tp) {
            console.log("TP Short")
            this.liquidshort();
            this.current_status = SEEKING_CUTDOWN;
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
        const current_ema = this.tvindicator["TIENEMA"];
        const e5 = current_ema['5'];
        const e10 = current_ema['10'];

        // exit seeking
        if (e5 < e10) {
            this.current_action = STAND;
        }
    }

    seekingcutup() {
        const current_ema = this.tvindicator["TIENEMA"];
        const e5 = current_ema['5'];
        const e10 = current_ema['10'];

        // exit seeking
        if (e5 > e10) {
            this.current_action = STAND;
        }
    }

    async long() {
        const time = this.tvtime;
        const amount = 50000; // 100 USDT
        const price = this.tvclose;
        const qty = this.round(amount / price);
        const sl_price = price * (1 - this.options.sl);
        const tp_price = price * (1 + this.options.tp);

        console.log(`[${time}] Buy ${qty} ${this.symbol_str} with price ${price}`);

        this.record('buy', price, qty);
        this.qty = qty;
        this.price = price;
        this.sl_price = sl_price;
        this.tp_price = tp_price;
    }

    async liquidlong() {
        const time = this.tvtime;
        const qty = this.qty;
        const price = this.tvclose;
        this.record_pnl(qty, LONG, this.price, price);

        console.log(`[${time}] Liquid buy ${qty} ${this.symbol_str} with price ${price}`);

        this.record('sell', price, qty);
        this.price = 0;
        this.qty = 0;
    }

    short() {
        const time = this.tvtime;
        const amount = 50000; // 100 USDT
        const price = this.tvclose;
        const qty = this.round(amount / price);
        const sl_price = price * (1 + this.options.sl);
        const tp_price = price * (1 - this.options.tp);

        console.log(`[${time}] Sell ${qty} ${this.symbol_str} with price ${price}`);

        this.record('sell', price, qty);
        this.qty = qty;
        this.price = price;
        this.sl_price = sl_price;
        this.tp_price = tp_price;
    }

    async liquidshort() {
        const time = this.tvtime;
        const qty = this.qty;
        const price = this.tvclose;
        this.record_pnl(qty, SHORT, this.price, price);

        console.log(`[${time}] Liquid sell ${qty} ${this.symbol_str} with price ${price}`);

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