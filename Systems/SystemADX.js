const moment = require("moment");
const axios = require("axios");

const LONG = 0;
const SHORT = 1;
const STAND = 2;
const WAIT_LONG = 3;
const WAIT_SHORT = 4;
const TP_LONG = 5;
const TP_SHORT = 6;

async function loadDelay() {
    delay = null;
    await import("delay").then((val) => { delay = val.default });
    return delay;
}

module.exports = class TradingSystem {
    current_action = STAND;
    indicators = {};
    price = 0;
    usdt = 50000;
    debug = false;


    // mode: forward or replay
    constructor(exchange_str, exchange, symbol_str, timeframe_str, chart, indicators, mode = "forward") {
        this.exchange_str = exchange_str;
        this.exchange = exchange;
        this.chart = chart;
        this.symbol_str = symbol_str;
        this.timeframe_str = timeframe_str;
        this.indicators = indicators;
        this.debug = false;
        this.init();

    }
    init() {
        axios.get(`https://api-testnet.bybit.com/v5/market/instruments-info?category=linear&symbol=${this.symbol_str}`).then(res => {
            this.qtyStep = res.data.result.list[0].lotSizeFilter.qtyStep;
        });
        this.options = this.options || {};
        this.options.slRatio = 0.01;
        this.options.tpRatio = 0.006;
        this.buffer = {};
        this.buffer.chart = {};
        this.buffer.indicators = {};
        this.buffer.indicators["TIENEMA"] = {};
        this.buffer.indicators["TIENADX"] = {};
        this.isFirst = true;
    }
    start() {
        const chart = this.chart;
        chart.onUpdate(() => { // When price changes
            if (!chart.periods[0]) return;

            if (this.isFirst) {
                this.isFirst = false;
                this.lasttime = chart.periods[0].time;
                this.buffer.chart.period = this.chart.periods[0];
                this.buffer.indicators['TIENEMA'].periods = [this.indicators['TIENEMA'].periods[0], this.indicators['TIENEMA'].periods[1], this.indicators['TIENEMA'].periods[2], this.indicators['TIENEMA'].periods[3]];
                this.buffer.indicators['TIENADX'].periods = [this.indicators['TIENADX'].periods[0], this.indicators['TIENADX'].periods[1], this.indicators['TIENADX'].periods[2], this.indicators['TIENADX'].periods[3]];
            }

            if (chart.periods[0].time != this.lasttime) {
                this.lasttime = chart.periods[0].time
                const period = this.buffer.chart.period;
                console.log(`[${moment().format()}] ${this.exchange_str}:${this.symbol_str} Time:${period.time} Open:${period.open} High:${period.max} Low:${period.min} Close:${period.close} Volume:${period.volume}`);
                this.onClose();
            } else {
                this.buffer.chart.period = this.chart.periods[0];
                this.buffer.indicators['TIENEMA'].periods = [this.indicators['TIENEMA'].periods[0], this.indicators['TIENEMA'].periods[1], this.indicators['TIENEMA'].periods[2], this.indicators['TIENEMA'].periods[3]];
                this.buffer.indicators['TIENADX'].periods = [this.indicators['TIENADX'].periods[0], this.indicators['TIENADX'].periods[1], this.indicators['TIENADX'].periods[2], this.indicators['TIENADX'].periods[3]];
                // this.onUpdate();
                // console.log(this.buffer.indicators['TIENEMA'].periods);
            }
        });
    }

    onClose() {
        switch (this.current_action) {
            case STAND:
                this.takePosition();
                break;
            case WAIT_LONG:
                this.waitLong();
                break;
            case WAIT_SHORT:
                this.waitShort();
                break;
            case LONG:
                this.slLongOnClose();
                this.tpLongOnClose();
                break;
            case SHORT:
                this.slShortOnClose();
                this.tpShortOnClose();
                break;
            case TP_LONG:
                this.standFromTPLong();
                break;
            case TP_SHORT:
                this.standFromTPShort();
                break;
        }
    }

    // onUpdate() {
    //     switch (this.current_action) {
    //         case LONG:
    //             this.tpLongOnClose();
    //             break;
    //         case SHORT:
    //             this.tpShortOnClose();
    //             break;
    //     }
    // }

    takePosition() {
        const close = this.buffer.chart.period.close;
        const current_ema = this.buffer.indicators['TIENEMA'].periods[0];
        const e5_2 = current_ema['5_2'];
        const e10_2 = current_ema['10_2'];
        const e20_2 = current_ema['20_2'];
        const e50_2 = current_ema['50_2'];
        const e200_2 = current_ema['200_2'];
        const cap = this.buffer.indicators['TIENADX'].periods; // current_adx_periods

        const current_adx_condition = cap[0]["ADX"] >= 20;
        const chain_adx_condition = cap[0]["ADX"] > cap[1]["ADX"] && cap[1]["ADX"] > cap[2]["ADX"] && cap[2]["ADX"] > cap[3]["ADX"];

        // Check short
        const short_ema_condition = close < e5_2 && e5_2 < e10_2 && e10_2 < e20_2 && e20_2 < e50_2 && e50_2 < e200_2;
        if (short_ema_condition && current_adx_condition && chain_adx_condition) {
            console.log(`[${moment().format()}] Wait Long: Current ${close} e5: ${e5_2}, e10: ${e10_2}, e20: ${e20_2}, e50: ${e50_2}, e200: ${e200_2}`);
            this.current_action = WAIT_SHORT;
            return;
        }

        // Check long
        const long_ema_condition = close > e5_2 && e5_2 > e10_2 && e10_2 > e20_2 && e20_2 > e50_2 && e50_2 > e200_2;
        if (long_ema_condition && current_adx_condition && chain_adx_condition) {
            console.log(`[${moment().format()}] Wait Short: Current ${close} e5: ${e5_2}, e10: ${e10_2}, e20: ${e20_2}, e50: ${e50_2}, e200: ${e200_2}`);
            this.current_action = WAIT_LONG;
            return;
        }
        return;
    }
    waitLong() {
        const close = this.buffer.chart.period.close;
        const current_ema = this.buffer.indicators['TIENEMA'].periods[0];
        const e5 = current_ema['5'];
        const e10 = current_ema['10'];
        const e20 = current_ema['20'];
        const e50 = current_ema['50'];
        const e200 = current_ema['200'];

        const entry_condition = close < e5 && close < e10 && close < e20 && close < e50 && close < e200;
        if (entry_condition) {
            console.log(`[${moment().format()}] Long: Current ${close} e5: ${e5}, e10: ${e10}, e20: ${e20}, e50: ${e50}, e200: ${e200}`);
            this.long();
            this.current_action = LONG;
            this.recordPosition();
        }
    }

    waitShort() {
        const close = this.buffer.chart.period.close;
        const current_ema = this.buffer.indicators['TIENEMA'].periods[0];
        const e5 = current_ema['5'];
        const e10 = current_ema['10'];
        const e20 = current_ema['20'];
        const e50 = current_ema['50'];
        const e200 = current_ema['200'];

        const entry_condition = close > e5 && close > e10 && close > e20 && close > e50 && close > e200;
        if (entry_condition) {
            console.log(`[${moment().format()}] Short: Current ${close} e5: ${e5}, e10: ${e10}, e20: ${e20}, e50: ${e50}, e200: ${e200}`);
            this.short();
            this.current_action = SHORT;
            this.recordPosition();
        }
    }

    slLongOnClose() {
        const close = this.buffer.chart.period.close;

        const sl_price = this.position.close * (1 - this.options.slRatio);
        const sl_condition = close < sl_price;
        if (sl_condition) {
            console.log(`[${moment().format()}] SL Long: Current ${close} SL Price ${sl_price} Position ${this.position.close}`);
            this.liquidlong();
            this.current_action = STAND;
        }
    }

    tpLongOnClose() {
        const close = this.buffer.chart.period.close;
        const current_ema = this.buffer.indicators['TIENEMA'].periods[0];
        const e5 = current_ema['5'];
        const e10 = current_ema['10'];
        const e20 = current_ema['20'];
        const e50 = current_ema['50'];
        const e200 = current_ema['200'];

        const exit_condition = close > e5 && close > e10 && close > e20 && close > e50 && close > e200;

        const tp_price = this.position.close * (1 + this.options.tpRatio);
        const tp_condition = close >= tp_price;
        if (exit_condition && tp_condition) {
            console.log(`[${moment().format()}] TP Long: Current ${close} TP Price ${tp_price} Position ${this.position.close}`);
            this.liquidlong();
            this.current_action = STAND;
        }
    }

    slShortOnClose() {
        const close = this.buffer.chart.period.close;

        const sl_price = this.position.close * (1 + this.options.slRatio);
        const sl_condition = close > sl_price;
        if (sl_condition) {
            console.log(`[${moment().format()}] SL Short: Current ${close} SL Price ${sl_price} Position ${this.position.close}`);
            this.liquidshort();
            this.current_action = STAND;
        }
    }

    tpShortOnClose() {
        const close = this.buffer.chart.period.close;
        const current_ema = this.buffer.indicators['TIENEMA'].periods[0];
        const e5 = current_ema['5'];
        const e10 = current_ema['10'];
        const e20 = current_ema['20'];
        const e50 = current_ema['50'];
        const e200 = current_ema['200'];

        const exit_condition = close < e5 && close < e10 && close < e20 && close < e50 && close < e200;

        const tp_price = this.position.close * (1 - this.options.tpRatio);
        const tp_condition = close >= tp_price;
        if (exit_condition && tp_condition) {
            console.log(`[${moment().format()}] TP Short: Current ${close} TP Price ${tp_price} Position ${this.position.close}`);
            this.liquidlong();
            this.current_action = STAND;
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
            })
            .catch(error => {
                console.log(`Error occured when buy ${qty} ${this.symbol_str} with price ${price}`);
                console.error('Error:', error);
                this.current_action = STAND;
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
            })
            .catch(error => {
                console.log(`Error occured when liquid byt ${qty} ${this.symbol_str} with price ${price}`);
                console.error('Error:', error);
                this.current_action = LONG;
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
            })
            .catch(error => {
                console.log(`Error occured when sell ${qty} ${this.symbol_str} with price ${price}`);
                console.error('Error:', error);
                this.current_action = STAND;
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
            })
            .catch(error => {
                console.log(`Error occured when liquid sell ${qty} ${this.symbol_str} with price ${price}`);
                console.error('Error:', error);
                this.current_action = SHORT;
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
        this.position = this.buffer.chart.period;
    }
}