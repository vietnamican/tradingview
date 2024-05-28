const moment = require("moment");
const axios = require("axios");
const fs = require("fs");
const path = require('path');

const LONG = 0;
const SHORT = 1;
const STAND = 2;
const WAIT_LONG = 3;
const WAIT_SHORT = 4;
const SEEK_LONG = 5;
const SEEK_SHORT = 6;

module.exports = class TradingSystem {

    constructor(exchange_str, exchange, symbol_str, timeframe_str, chart, indicators, resume_path) {
        this.exchange_str = exchange_str;
        this.exchange = exchange;
        this.chart = chart;
        this.symbol_str = symbol_str;
        this.timeframe_str = timeframe_str;
        this.indicators = indicators;
        this.debug = false;
        this.resume_path = resume_path;
        this.init();
    }

    init() {
        axios.get(`https://api-testnet.bybit.com/v5/market/instruments-info?category=linear&symbol=${this.symbol_str}`).then(res => {
            this.qtyStep = res.data.result.list[0].lotSizeFilter.qtyStep;
        });
        this.isFirst = true;
        this.lasttime = -1;
        this.current_action = STAND;
        this.position = null;
        this.price = 0;
        this.qty = 0;
        this.usdt = 50000;

        this.options = this.options || {};
        this.options.slRatio = 0.006;
        this.options.tpRatios = [0.01, 0.015, 0.018, 0.02, 0.025, 0.03, 0.035, 0.04, 0.045, 0.05, 0.055, 0.06, 0.065, 0.07, 0.075, 0.08, 0.085, 0.09, 0.1, 0.15, 0.2];
        this.options.cancelSlRatio = 0.005;
        this.options.cancelTpRatio = 0.005;
        this.buffer = {};
        this.buffer.tpIndex = 0;
        this.buffer.chart = {};
        this.buffer.indicators = {};
        this.buffer.indicators["TIENEMA"] = {};
        this.buffer.indicators["TIENADX"] = {};
    }

    start() {
        const chart = this.chart;
        chart.onUpdate(() => { // When price changes
            if (!chart.periods[0]) return;

            if (this.isFirst) {
                this.isFirst = false;
                this.lasttime = chart.periods[0].time;
                this.buffer.chart.periods = [this.chart.periods[0], this.chart.periods[1], this.chart.periods[2], this.chart.periods[3]];
                this.buffer.indicators['TIENEMA'].periods = [this.indicators['TIENEMA'].periods[0], this.indicators['TIENEMA'].periods[15], this.indicators['TIENEMA'].periods[30], this.indicators['TIENEMA'].periods[45]];
                this.buffer.indicators['TIENADX'].periods = [this.indicators['TIENADX'].periods[0], this.indicators['TIENADX'].periods[15], this.indicators['TIENADX'].periods[30], this.indicators['TIENADX'].periods[45]];
                this.backup();
            }

            if (chart.periods[0].time != this.lasttime) {
                this.lasttime = chart.periods[0].time
                const periods = this.buffer.chart.periods;
                console.log(`[${moment().format()}] ${this.exchange_str}:${this.symbol_str} Time:${periods[0].time} Open:${periods[0].open} High:${periods[0].max} Low:${periods[0].min} Close:${periods[0].close} Volume:${periods[0].volume}`);
                this.onClose();
                this.backup();
            } else {
                this.buffer.chart.periods = [this.chart.periods[0], this.chart.periods[1], this.chart.periods[2], this.chart.periods[3]];
                this.buffer.indicators['TIENEMA'].periods = [this.indicators['TIENEMA'].periods[0], this.indicators['TIENEMA'].periods[15], this.indicators['TIENEMA'].periods[30], this.indicators['TIENEMA'].periods[45]];
                this.buffer.indicators['TIENADX'].periods = [this.indicators['TIENADX'].periods[0], this.indicators['TIENADX'].periods[15], this.indicators['TIENADX'].periods[30], this.indicators['TIENADX'].periods[45]];
                this.onUpdate();
            }
        });
    }

    resume() {
        if (fs.existsSync(this.resume_path)) {
            const data = JSON.parse(fs.readFileSync(this.resume_path));
            this.isFirst = data.isFirst;
            this.lasttime = data.lasttime;
            this.current_action = data.current_action;
            this.position = data.position;
            this.qty = data.qty;
            this.price = data.price;
            this.usdt = data.usdt;
            this.buffer.chart.periods = data.buffer.chart.periods;
            this.buffer.indicators['TIENEMA'].periods = data.buffer.indicators['TIENEMA'].periods
            this.buffer.indicators['TIENADX'].periods = data.buffer.indicators['TIENADX'].periods
            console.log(`[${moment().format()}] Resume from ${this.resume_path} done`)
        }
        this.start();
    }

    backup() {
        if (!fs.existsSync(this.resume_path)) {
            const dirpath = path.dirname(this.resume_path);
            const filename = path.basename(this.resume_path);
            fs.mkdirSync(dirpath, { recursive: true });
        }
        let data = {}
        data.isFirst = this.isFirst;
        data.lasttime = this.lasttime;
        data.current_action = this.current_action;
        data.position = this.position;
        data.qty = this.qty;
        data.price = this.price;
        data.usdt = this.usdt;
        data.buffer = {};
        data.buffer.chart = {};
        data.buffer.chart.periods = this.buffer.chart.periods
        data.buffer.indicators = {};
        data.buffer.indicators['TIENEMA'] = {}
        data.buffer.indicators['TIENEMA'].periods = this.buffer.indicators['TIENEMA'].periods
        data.buffer.indicators['TIENADX'] = {}
        data.buffer.indicators['TIENADX'].periods = this.buffer.indicators['TIENADX'].periods
        fs.writeFileSync(this.resume_path, JSON.stringify(data));
    }

    onClose() {
        switch (this.current_action) {
            case STAND:
                this.takePosition();
                break;
            case WAIT_LONG:
                this.cancel();
                this.waitLong();
                break;
            case SEEK_LONG:
                this.cancel();
                this.seekLong();
                break;
            case WAIT_SHORT:
                this.cancel();
                this.waitShort();
                break;
            case SEEK_SHORT:
                this.cancel();
                this.seekShort();
                break;
            case LONG:
                this.slLongOnClose();
                this.tpLongOnClose();
                this.cancelWhenLong();
                break;
            case SHORT:
                this.slShortOnClose();
                this.tpShortOnClose();
                this.cancelWhenShort();
                break;
        }
    }

    onUpdate() {
        // switch (this.current_action) {
        //     case LONG:
        //         this.slLongOnClose();
        //         this.tpLongOnClose();
        //         this.cancelWhenLong();
        //         break;
        //     case SHORT:
        //         this.slShortOnClose();
        //         this.tpShortOnClose();
        //         this.cancelWhenShort();
        //         break;
        // }
    }

    takePosition() {
        const periods = this.buffer.chart.periods;
        const current_ema = this.buffer.indicators['TIENEMA'].periods[0];
        const e5_2 = current_ema['5_2'];
        const e10_2 = current_ema['10_2'];
        const e20_2 = current_ema['20_2'];
        const e50_2 = current_ema['50_2'];
        const e200_2 = current_ema['200_2'];
        const cap = this.buffer.indicators['TIENADX'].periods; // current_adx_periods

        const current_adx_condition = cap[0]["ADX"] >= 22;
        const chain_adx_condition = cap[0]["ADX"] > cap[1]["ADX"] && cap[1]["ADX"] > cap[2]["ADX"] && cap[2]["ADX"] > cap[3]["ADX"];

        // console.log(`[${moment().format()}] ${cap[0]["ADX"]} ${cap[1]["ADX"]} ${cap[2]["ADX"]} ${cap[3]["ADX"]}`)
        // console.log(`[${moment().format()}] Current ${periods[0].close} e5: ${e5_2}, e10: ${e10_2}, e20: ${e20_2}, e50: ${e50_2}, e200: ${e200_2}`)

        // Check long
        const long_ema_condition = e5_2 < e10_2 && e10_2 < e20_2 && e20_2 < e50_2 && e50_2 < e200_2;
        if (long_ema_condition && current_adx_condition && chain_adx_condition) {
            console.log(`[${moment().format()}] Wait Long: Current ${periods[0].close} e5: ${e5_2}, e10: ${e10_2}, e20: ${e20_2}, e50: ${e50_2}, e200: ${e200_2}`);
            this.current_action = WAIT_LONG;
            this.backup();
            return;
        }

        // Check short
        const short_ema_condition = e5_2 > e10_2 && e10_2 > e20_2 && e20_2 > e50_2 && e50_2 > e200_2;
        if (short_ema_condition && current_adx_condition && chain_adx_condition) {
            console.log(`[${moment().format()}] Wait Short: Current ${periods[0].close} e5: ${e5_2}, e10: ${e10_2}, e20: ${e20_2}, e50: ${e50_2}, e200: ${e200_2}`);
            this.current_action = WAIT_SHORT;
            this.backup();
            return;
        }
        return;
    }

    cancel() {
        const current_ema = this.buffer.indicators['TIENEMA'].periods[0];
        const e5_2 = current_ema['5_2'];
        const e10_2 = current_ema['10_2'];
        const e20_2 = current_ema['20_2'];
        const e50_2 = current_ema['50_2'];
        const e200_2 = current_ema['200_2'];

        if (this.current_action === WAIT_LONG || this.current_action == SEEK_LONG) {
            const long_ema_condition = e5_2 < e10_2 && e10_2 < e20_2 && e20_2 < e50_2 && e50_2 < e200_2;
            if (!long_ema_condition) {
                this.current_action = STAND;
                this.backup();
            }
            return;
        }

        if (this.current_action === WAIT_SHORT || this.current_action == SEEK_SHORT) {
            const short_ema_condition = e5_2 > e10_2 && e10_2 > e20_2 && e20_2 > e50_2 && e50_2 > e200_2;
            if (!short_ema_condition) {
                this.current_action = STAND;
                this.backup();
            }
            return;
        }
    }

    waitLong() {
        const periods = this.buffer.chart.periods;
        const current_ema = this.buffer.indicators['TIENEMA'].periods[0];
        const e5 = current_ema['5'];
        const e10 = current_ema['10'];
        const e20 = current_ema['20'];
        const e50 = current_ema['50'];
        const e200 = current_ema['200'];

        const entry_condition = periods[0].close > e5 && periods[0].close > e10 && periods[0].close > e20 && periods[0].close > e50 && periods[0].close > e200;
        if (entry_condition) {
            console.log(`[${moment().format()}] Seek Long: Current ${periods[0].close} e5: ${e5}, e10: ${e10}, e20: ${e20}, e50: ${e50}, e200: ${e200}`);
            this.current_action = SEEK_LONG;
            this.backup();
        }
    }

    seekLong() {
        const periods = this.buffer.chart.periods;
        const current_ema = this.buffer.indicators['TIENEMA'].periods[0];
        const e5 = current_ema['5'];
        const e10 = current_ema['10'];
        const e20 = current_ema['20'];
        const e50 = current_ema['50'];
        const e200 = current_ema['200'];

        const ema_condition = periods[0].close <= e200;
        const close_condition = periods[0].close <= periods[1].close && periods[0].close <= periods[2].close && periods[0].close <= periods[3].close && periods[0].close <= periods[4].close;

        if (ema_condition || close_condition) {
            console.log(`[${moment().format()}] Long: Current ${periods[0].close} e5: ${e5}, e10: ${e10}, e20: ${e20}, e50: ${e50}, e200: ${e200}`);
            this.long();
            this.current_action = LONG;
            this.recordPosition();
            this.backup();
        }
    }

    waitShort() {
        const periods = this.buffer.chart.periods;
        const current_ema = this.buffer.indicators['TIENEMA'].periods[0];
        const e5 = current_ema['5'];
        const e10 = current_ema['10'];
        const e20 = current_ema['20'];
        const e50 = current_ema['50'];
        const e200 = current_ema['200'];

        const entry_condition = periods[0].close < e5 && periods[0].close < e10 && periods[0].close < e20 && periods[0].close < e50 && periods[0].close < e200;
        if (entry_condition) {
            console.log(`[${moment().format()}] Seek Short: Current ${periods[0].close} e5: ${e5}, e10: ${e10}, e20: ${e20}, e50: ${e50}, e200: ${e200}`);
            this.current_action = SEEK_SHORT;
            this.backup();
        }
    }

    seekShort() {
        const periods = this.buffer.chart.periods;
        const current_ema = this.buffer.indicators['TIENEMA'].periods[0];
        const e5 = current_ema['5'];
        const e10 = current_ema['10'];
        const e20 = current_ema['20'];
        const e50 = current_ema['50'];
        const e200 = current_ema['200'];

        const ema_condition = periods[0].close >= e200;
        const close_condition = periods[0].close >= periods[1].close && periods[0].close >= periods[2].close && periods[0].close >= periods[3].close && periods[0].close >= periods[4].close;

        if (ema_condition || close_condition) {
            console.log(`[${moment().format()}] Short: Current ${periods[0].close} e5: ${e5}, e10: ${e10}, e20: ${e20}, e50: ${e50}, e100: ${e200}`);
            this.short();
            this.current_action = SHORT;
            this.recordPosition();
            this.backup();
        }
    }

    slLongOnClose() {
        const periods = this.buffer.chart.periods;

        const sl_price = this.position.close * (1 - this.options.slRatio);
        const sl_condition = periods[0].close < sl_price;
        if (sl_condition) {
            console.log(`[${moment().format()}] SL Long: Current ${periods[0].close} SL Price ${sl_price} Position ${this.position.close}`);
            this.liquidlong();
            this.current_action = STAND;
            this.backup();
        }
    }

    tpLongOnClose() {
        const periods = this.buffer.chart.periods;

        if (this.buffer.tpIndex === 0) {
            const tp_price = this.position.close * (1 + this.options.tpRatios[this.buffer.tpIndex]);
            if (periods[0].close > tp_price) {
                this.buffer.tpIndex += 1;
                console.log(`[${moment().format()}] TP Long: TP Index ${this.buffer.tpIndex} Current ${periods[0].close} TP Price ${tp_price} Position ${this.position.close}`);
            }
        }
        if (this.buffer.tpIndex < this.options.tpRatios.length) {
            while (this.buffer.tpIndex < this.options.tpRatios.length) {
                const sl_price = this.position.close * (1 + this.options.tpRatios[this.buffer.tpIndex - 1])
                const tp_price = this.position.close * (1 + this.options.tpRatios[this.buffer.tpIndex])
                if (periods[0].close > tp_price) {
                    this.buffer.tpIndex += 1;
                    console.log(`[${moment().format()}] TP Long: TP Index ${this.buffer.tpIndex} Current ${periods[0].close} TP Price ${tp_price} Position ${this.position.close}`);
                } else if (periods[0].close <= sl_price) {
                    this.buffer.tpIndex = 0;
                    console.log(`[${moment().format()}] TP Long: Current ${periods[0].close} TP Price ${tp_price} Position ${this.position.close}`);
                    this.liquidlong();
                    this.current_action = STAND;
                    this.backup();
                    return;
                } else {
                    break;
                }
            }
        }
        if (this.buffer.tpIndex === this.options.tpRatios.length) {
            this.buffer.tpIndex = 0;
            console.log(`[${moment().format()}] TP Long: Current ${periods[0].close} TP Price ${tp_price} Position ${this.position.close}`);
            this.liquidlong();
            this.current_action = STAND;
            this.backup();
            return;
        }
    }

    cancelWhenLong() {
        const current_ema = this.buffer.indicators['TIENEMA'].periods[0];
        const e5_2 = current_ema['5_2'];
        const e10_2 = current_ema['10_2'];
        const e20_2 = current_ema['20_2'];
        const e50_2 = current_ema['50_2'];
        const e200_2 = current_ema['200_2'];
        const close_condition = e5_2 < e50_2;
        const tp_price = this.position.close * (1 + this.options.cancelTpRatio);
        const sl_price = this.position.close * (1 - this.options.cancelSlRatio);
        if (close_condition && periods[0].close < sl_price) {
            this.buffer.tpIndex = 0;
            console.log(`[${moment().format()}] cancel Long: Current ${periods[0].close}`);
            this.liquidlong();
            this.current_action = STAND;
            this.backup();
        }
    }

    slShortOnClose() {
        const periods = this.buffer.chart.periods;

        const sl_price = this.position.close * (1 + this.options.slRatio);
        const sl_condition = periods[0].close > sl_price;
        if (sl_condition) {
            console.log(`[${moment().format()}] SL Short: Current ${periods[0].close} SL Price ${sl_price} Position ${this.position.close}`);
            this.liquidshort();
            this.current_action = STAND;
            this.backup();
        }
    }

    tpShortOnClose() {
        const periods = this.buffer.chart.periods;

        if (this.buffer.tpIndex === 0) {
            const tp_price = this.position.close * (1 - this.options.tpRatios[this.buffer.tpIndex]);
            if (periods[0].close < tp_price) {
                this.buffer.tpIndex += 1;
                console.log(`[${moment().format()}] TP Short: TP Index ${this.buffer.tpIndex} Current ${periods[0].close} TP Price ${tp_price} Position ${this.position.close}`);
            }
        } else if (this.buffer.tpIndex < this.options.tpRatios.length) {
            while (this.buffer.tpIndex < this.options.tpRatios.length) {
                const sl_price = this.position.close * (1 - this.options.tpRatios[this.buffer.tpIndex - 1])
                const tp_price = this.position.close * (1 - this.options.tpRatios[this.buffer.tpIndex])
                if (periods[0].close < tp_price) {
                    this.buffer.tpIndex += 1;
                    console.log(`[${moment().format()}] TP Short: TP Index ${this.buffer.tpIndex} Current ${periods[0].close} TP Price ${tp_price} Position ${this.position.close}`);
                } else if (periods[0].close >= sl_price) {
                    this.buffer.tpIndex = 0;
                    console.log(`[${moment().format()}] TP Short: Current ${periods[0].close} TP Price ${tp_price} Position ${this.position.close}`);
                    this.liquidshort();
                    this.current_action = STAND;
                    this.backup();
                    return;
                } else {
                    break;
                }
            }
        }
        if (this.buffer.tpIndex === this.options.tpRatios.length) {
            this.buffer.tpIndex = 0;
            console.log(`[${moment().format()}] TP Short: Current ${periods[0].close} TP Price ${tp_price} Position ${this.position.close}`);
            this.liquidshort();
            this.current_action = STAND;
            this.backup();
            return;
        }
    }

    cancelWhenShort() {
        const current_ema = this.buffer.indicators['TIENEMA'].periods[0];
        const e5_2 = current_ema['5_2'];
        const e10_2 = current_ema['10_2'];
        const e20_2 = current_ema['20_2'];
        const e50_2 = current_ema['50_2'];
        const e200_2 = current_ema['200_2'];
        const close_condition = e5_2 > e50_2;
        const tp_price = this.position.close * (1 - this.options.cancelTpRatio);
        const sl_price = this.position.close * (1 + this.options.cancelSlRatio);
        if (close_condition && periods[0].close > sl_price) {
            this.buffer.tpIndex = 0;
            console.log(`[${moment().format()}] cancel Short: Current ${periods[0].close}`);
            this.liquidshort();
            this.current_action = STAND;
            this.backup();
        }
    }

    async long() {
        const amount = 1000; // 100 USDT
        const price = this.chart.periods[0].close;
        const qty = this.round(amount / price);
        const params = {
            "category": "linear",
            "side": "Buy",
            "orderType": "Market"
        }
        console.log(`Buy ${qty} ${this.symbol_str} with price ${price}`);
        this.call(() => { return this.exchange.createMarketBuyOrderWithCost(this.symbol_str, qty, params) })
            .then(result => {
                this.qty = qty;
                this.price = price;
                this.backup();
            })
            .catch(error => {
                console.log(`Error occured when buy ${qty} ${this.symbol_str} with price ${price}`);
                console.error('Error:', error);
                this.current_action = STAND;
                this.backup();
            });
    }

    async liquidlong() {
        const qty = this.qty;
        const price = this.price;
        const params = {
            "category": "linear",
            "side": "Sell",
            "orderType": "Market"
        }
        console.log(`Liquid buy ${qty} ${this.symbol_str} with price ${price}`);
        this.call(() => { return this.exchange.createMarketBuyOrderWithCost(this.symbol_str, qty, params) })
            .then(result => {
                this.qty = 0;
                this.price = 0;
                this.backup();
            })
            .catch(error => {
                console.log(`Error occured when liquid byt ${qty} ${this.symbol_str} with price ${price}`);
                console.error('Error:', error);
                this.current_action = LONG;
                this.backup();
            });
    }

    async short() {
        const amount = 1000; // 100 USDT
        const price = this.chart.periods[0].close;
        const qty = this.round(amount / price);
        const params = {
            "category": "linear",
            "side": "Sell",
            "orderType": "Market"
        }
        console.log(`Sell ${qty} ${this.symbol_str} with price ${price}`);
        this.call(() => { return this.exchange.createMarketBuyOrderWithCost(this.symbol_str, qty, params) })
            .then(result => {
                this.qty = qty;
                this.price = price;
                this.backup();
            })
            .catch(error => {
                console.log(`Error occured when sell ${qty} ${this.symbol_str} with price ${price}`);
                console.error('Error:', error);
                this.current_action = STAND;
                this.backup();
            });
    }

    async liquidshort() {
        const qty = this.qty;
        const price = this.price;
        const params = {
            "category": "linear",
            "side": "Buy",
            "orderType": "Market"
        }
        console.log(`Liquid sell ${qty} ${this.symbol_str} with price ${price}`);
        this.call(() => { return this.exchange.createMarketBuyOrderWithCost(this.symbol_str, qty, params) })
            .then(result => {
                this.qty = 0;
                this.price = 0;
                this.backup();
            })
            .catch(error => {
                console.log(`Error occured when liquid sell ${qty} ${this.symbol_str} with price ${price}`);
                console.error('Error:', error);
                this.current_action = SHORT;
                this.backup();
            });
    }

    call(promiseFunc, maxRetries = 3) {
        let retries = 0;

        const retry = async () => {
            try {
                const result = await promiseFunc();
                return result;
            } catch (error) {
                retries++;

                if (retries >= maxRetries) {
                    throw new Error(`Maximum retries (${maxRetries}) exceeded.`);
                }

                console.log(`Retrying... (${retries}/${maxRetries})`);
                return retry();
            }
        };

        return retry();
    }

    round(number) {
        return Math.round(number / this.qtyStep) * this.qtyStep;
    }

    recordPosition() {
        this.position = this.buffer.chart.periods[0];
    }
}