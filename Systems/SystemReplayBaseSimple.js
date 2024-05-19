const moment = require("moment");
const axios = require("axios");
const { isWholeDay, isWholeMinute } = require("../utils");
const fs = require('fs');
const path = require('path');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const LONG = 0;
const SHORT = 1;
const STAND = 2;
const SEEK_LONG = 3;
const SEEK_SHORT = 4;

async function loadDelay() {
    delay = null;
    await import("delay").then((val) => { delay = val.default });
    return delay;
}

module.exports = class TradingSystem {
    usdt = 50000;
    debug = false;

    // mode: forward or replay
    constructor(exchange_str, exchange, symbol_str, timeframe_str, chart, indicators, options) {
        this.exchange_str = exchange_str;
        this.exchange = exchange;
        this.chart = chart;
        this.symbol_str = symbol_str;
        this.timeframe_str = timeframe_str;
        this.indicators = indicators;
        this.options = options;
        this.debug = false;
        this.init();
    }
    init() {
        
        this.buffer = {};
        this.buffer.times = [];
        this.buffer.opens = [];
        this.buffer.highs = [];
        this.buffer.lows = [];
        this.buffer.closes = [];
        this.buffer.indicators = {};
        this.buffer.indicators['TIENEMA'] = [];
        this.buffer.indicators['TIENRSI'] = [];

        this.logs = {};
        this.logs.positions = [];
        this.logs.balances = [];
        this.logs.pnls = [];
        this.logs.actions = [];

        this.market = {};
        this.market.qtyStep = 0.1;
        this.market.price = 0;
        
        this.action = STAND;

        this.options = this.options || {};
        if (!this.options.history_length) {
            this.options.history_length = 10;
        }
    }
    async updateStatus(i) {
        this.buffer.times.unshift(this.chart.periods[i].time);
        this.buffer.opens.unshift(this.chart.periods[i].open);
        this.buffer.highs.unshift(this.chart.periods[i].high);
        this.buffer.lows.unshift(this.chart.periods[i].low);
        this.buffer.closes.unshift(this.chart.periods[i].close);
        this.buffer.volumes.unshift(this.chart.periods[i].volume);

        this.buffer.times.splice(this.options.history_length);
        this.buffer.opens.splice(this.options.history_length);
        this.buffer.highs.splice(this.options.history_length);
        this.buffer.lows.splice(this.options.history_length);
        this.buffer.closes.splice(this.options.history_length);
        this.buffer.volumes.splice(this.options.history_length);

        this.buffer.indicators["TIENEMA"].unshift(this.indicators["TIENEMA"].periods[i]);
        this.buffer.indicators["TIENRSI"].unshift(this.indicators["TIENRSI"].periods[i]);

        this.buffer.indicators["TIENEMA"].splice(this.options.history_length);
        this.buffer.indicators["TIENRSI"].splice(this.options.history_length);

        if (isWholeDay(Number(this.buffer.times[0]))) {
            const balance = this.balance();
            this.balance_logs.push({ "time": this.buffer.times[0], "balance": balance });
        }
    }
    async start() {
        await import("delay").then((val) => { this.delay = val.default })
        const chart = this.chart;
        for (let i = 0; i < chart.periods.length; i++) {
            if (i >= 14) {
                this.updateStatus(i);
                this.onClose();
                // this.onUpdate();
            }
        }
        await this.write_balance();
        await this.write_pnl();
    }

    onClose() {
        switch (this.current_action) {
            case STAND:
                this.takePosition();
                break;
            case LONG:
                this.slLongOnClose();
                this.tpLongOnClose();
                this.closeLongOnClose();
                break;
            case SHORT:
                this.slShortOnClose();
                this.tpShortOnClose();
                this.closeShortOnClose();
                break;
            case SEEK_LONG:
                this.seekLong();
                break;
            case SEEK_SHORT:
                this.seekShort();
                break;
        }
    }

    // // with replay mode, onUpdate is equal to onClose
    // onUpdate() {
    //     switch (this.current_action) {
    //         case STAND:
    //             this.takePosition();
    //             break;
    //         case LONG:
    //             this.slLongOnClose();
    //             this.tpLongOnClose();
    //             this.closeLongOnClose();
    //             break;
    //         case SHORT:
    //             this.slShortOnClose();
    //             this.tpShortOnClose();
    //             this.closeShortOnClose();
    //             break;
    //         case SEEK_LONG:
    //             this.seekingLong();
    //             break;
    //         case SEEK_SHORT:
    //             this.seekingShort();
    //             break;
    //     }
    // }

    takePosition() {
        // Require prices and indicators
        const close = this.buffer.closes[0];
        const current_ema = this.buffer.indicators["TIENEMA"][0];
        const e5 = current_ema['5'];
        const e10 = current_ema['10'];
        const e20 = current_ema['20'];

        // Check long
        // Take long
        // Change action to long
        const ema_long_condition = close > e5 && e5 > e10 && e10 > e20;
        if (ema_long_condition) {
            this.long();
            this.current_action = LONG;
            this.recordPosition();
            this.balance();
            return;
        }

        // Check short
        // Take short
        // Change action to short
        const ema_short_condition = close < e5 && e5 < e10 && e10 < e20;
        if (ema_short_condition) {
            this.short();
            this.current_action = SHORT;
            this.recordPosition();
            this.balance();
            return;
        }
    }

    slLongOnClose() {
        // Require prices and indicators        
        const close = this.buffer.closes[0];
        const current_ema = this.buffer.indicators["TIENEMA"][0];
        const e5 = current_ema['5'];
        const e10 = current_ema['10'];
        const e20 = current_ema['20'];

        // Check SL
        // Take SL
        // Change action to SEEK_LONG
        const positionRange = this.position.close - this.position.open;
        const downRatio = 0.5;
        if (close < this.position.open + positionRange * downRatio) {
            this.liquidlong();
            this.balance();
            this.current_action = SEEK_LONG;
        }
    }

    tpLongOnClose() {
        // Require prices and indicators        

        // Check TP
        // Take TP
        // Change action to SEEK_LONG
    }

    closeLongOnClose() {
        // Require prices and indicators
        const current_ema = this.buffer.indicators["TIENEMA"][0];
        const e5 = current_ema['5'];
        const e10 = current_ema['10'];

        // Check TP
        // Take TP
        // Change action to STAND
        if (e5 < e10) {
            this.liquidlong();
            this.balance();
            this.current_action = STAND;
        }
    }

    slShortOnClose() {
        // Require prices and indicators
        const close = this.buffer.closes[0];
        const current_ema = this.buffer.indicators["TIENEMA"][0];
        const e5 = current_ema['5'];
        const e10 = current_ema['10'];
        const e20 = current_ema['20'];

        // Check SL
        // Take SL
        // Change action to SEEK_SHORT
        const positionRange = this.position.open - this.position.close;
        const downRatio = 0.5;
        if (close > this.position.close + positionRange * downRatio) {
            this.liquidshort();
            this.balance();
            this.current_action = SEEK_SHORT;
        }
    }

    tpShortOnClose() {
        // Require prices and indicators

        // Check TP
        // Take TP
        // Change action to SEEK_SHORT
    }

    closeShortOnClose() {
        // Require prices and indicators
        const current_ema = this.buffer.indicators["TIENEMA"][0];
        const e5 = current_ema['5'];
        const e10 = current_ema['10'];

        // Check TP
        // Take TP
        // Change action to STAND
        if (e5 > e10) {
            this.liquidshort();
            this.balance();
            this.current_action = STAND;
        }
    }


    seekLong() {
        // Require prices and indicators
        const current_ema = this.buffer.indicators["TIENEMA"][0];
        const e5 = current_ema['5'];
        const e10 = current_ema['10'];

        // Check Stand condition from Long
        // Change action to STAND
        if (e5 < e10) {
            this.current_action = STAND;
        }
    }

    seekShort() {
        // Require prices and indicators
        const current_ema = this.buffer.indicators["TIENEMA"][0];
        const e5 = current_ema['5'];
        const e10 = current_ema['10'];

        // Check Stand condition from Short
        // Change action to STAND
        if (e5 > e10) {
            this.current_action = STAND;
        }
    }


    // triggered by takePosition
    long() {
        const time = this.buffer.times[0];
        const amount = 50000; // 100 USDT
        const price = this.buffer.closes[0];
        const qty = this.round(amount / price);

        console.log(`[${moment.unix(time / 1000).format()}] ${time} Buy ${qty} ${this.symbol_str} with price ${price}`);

        this.commit('buy', price, qty);
        this.qty = qty;
        this.price = price;
    }

    // triggerd by slLongOnClose/tpLongOnClose/closeLongOnClose
    liquidlong() {
        const time = this.buffer.times[0];
        const qty = this.qty;
        const price = this.buffer.closes[0];
        this.record_pnl(qty, LONG, this.price, price);

        console.log(`[${moment.unix(time / 1000).format()}] ${this.buffer.times[0]} Liquid buy ${qty} ${this.symbol_str} with price ${price}`);

        this.commit('sell', price, qty);
        this.price = 0;
        this.qty = 0;
    }

    // triggered by takePosition
    short() {
        const time = this.buffer.times[0];
        const amount = 50000; // 100 USDT
        const price = this.buffer.closes[0];
        const qty = this.round(amount / price);

        console.log(`[${moment.unix(time / 1000).format()}] ${this.buffer.times[0]} Sell ${qty} ${this.symbol_str} with price ${price}`);

        this.commit('sell', price, qty);
        this.qty = qty;
        this.price = price;
    }

    // triggerd by slShortOnClose/tpShortOnClose/closeShortOnClose
    liquidshort() {
        const time = this.buffer.times[0];
        const qty = this.qty;
        const price = this.buffer.closes[0];
        this.record_pnl(qty, SHORT, this.price, price);

        console.log(`[${moment.unix(time / 1000).format()}] ${this.buffer.times[0]} Liquid sell ${qty} ${this.symbol_str} with price ${price}`);

        this.commit('buy', price, qty);
        this.qty = 0;
        this.price = 0;
    }

    commit(action, price, qty) {
        if (action === 'buy') {
            this.usdt -= price * qty;
        } else if (action == 'sell') {
            this.usdt += price * qty;
        }
    }

    balance() {
        let total = 0;
        const time = this.buffer.times[0];
        if (this.current_action == LONG) {
            total = this.usdt + this.price * this.qty;
            total -= this.price * this.qty * 0.055 / 100;
        } else if (this.current_action == SHORT) {
            total = this.usdt - this.price * this.qty;
            total -= this.price * this.qty * 0.055 / 100;
        } else {
            total = this.usdt;
        }
        console.log(`[${moment.unix(time / 1000).format()}] Your balance is ${total}`);
        return total;
    }

    recordPosition() {
        const position = {};
        position.action = this.current_action;
        position.time = this.buffer.times[0];
        position.open = this.buffer.opens[0];
        position.high = this.buffer.highs[0];
        position.low = this.buffer.lows[0];
        position.close = this.buffer.closes[0];
        position.volume = this.buffer.volumes[0];
        position.index = 0;
        this.position = position;
        this.positions_logs.push(position);
    }

    record_pnl(qty, action, first_price, second_price) {
        const time = this.buffer.times[0];
        let pnl = 0;
        if (action === LONG) {
            pnl = (second_price - first_price) * qty;
        } else if (action == SHORT) {
            pnl = (first_price - second_price) * qty;
        }
        console.log(`[${moment.unix(time / 1000).format()}] ${time} PNL: ${pnl}`)
        this.pnl_logs.push({ "time": time, "pnl": pnl });
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

    round(number) {
        return Math.round(number / this.qtyStep) * this.qtyStep;
    }
}