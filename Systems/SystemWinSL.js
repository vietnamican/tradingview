const moment = require("moment");
const axios = require("axios");

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
        this.buffer = {};
        this.buffer.chart = {};
        this.buffer.indicators = {};
        this.buffer.indicators["TIENEMA"] = {};
        this.buffer.indicators["TIENRSI"] = {};
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
                this.buffer.indicators['TIENEMA'].period = this.indicators['TIENEMA'].periods[0];
                this.buffer.indicators['TIENRSI'].period = this.indicators['TIENRSI'].periods[0];
            }

            if (chart.periods[0].time != this.lasttime) {
                this.lasttime = chart.periods[0].time
                const period = this.buffer.chart.period;
                console.log(`[${moment().format()}] ${this.exchange_str}:${this.symbol_str} Time:${period.time} Open:${period.open} High:${period.max} Low:${period.min} Close:${period.close} Volume:${period.volume}`);
                this.onClose();
            } else {
                this.buffer.chart.period = this.chart.periods[0];
                this.buffer.indicators['TIENEMA'].period = this.indicators['TIENEMA'].periods[0];
                this.buffer.indicators['TIENRSI'].period = this.indicators['TIENRSI'].periods[0];
                this.onUpdate();
            }
        });
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
                console.log(`[System::onClose] on short action for ${this.exchange_str}:${this.symbol_str}`);
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

    onUpdate() {
        switch (this.current_action) {
            case LONG:
                this.tpLongOnClose();
                break;
            case SHORT:
                this.tpShortOnClose();
                break;
        }
    }

    takePosition() {
        const close = this.buffer.chart.period.close;
        const current_ema = this.buffer.indicators['TIENEMA'].period;
        const e5 = current_ema['5'];
        const e10 = current_ema['10'];
        const e20 = current_ema['20'];
        const e50 = current_ema['50'];
        const e100 = current_ema['100'];
        const e200 = current_ema['200'];
        const current_rsi = this.buffer.indicators['TIENRSI'].period;
        const rsi = current_rsi["RSI"]

        // Check long
        const long_ema_condition = close < e5 && e5 < e10 && e10 < e20 && e20 < e50 && e50 < e100 && e100 < e200;
        const long_rsi_condition = rsi < 30;
        if (long_ema_condition && long_rsi_condition) {
            this.long();
            this.current_action = LONG;
            this.recordPosition();
            return;
        }

        // Check short
        const short_ema_condition = close > e5 && e5 > e10 && e10 > e20 && e20 > e50 && e50 > e100 && e100 > e200;
        const short_rsi_condition = rsi > 70;
        if (short_ema_condition && short_rsi_condition) {
            this.short();
            this.current_action = SHORT;
            this.recordPosition();
            return;
        }
        return;
    }

    slLongOnClose() {
        console.log(`[System::slLongOnClose] seeking for SL Long Signal for ${this.exchange_str}:${this.symbol_str} position: ${this.position.open} ${this.position.close}`);
        if (this.current_action !== LONG) {
            return;
        }
        const close = this.buffer.chart.period.close;

        const positionRange = this.position.open - this.position.close;
        const downRatio = 0.5;
        if (close < this.position.close - positionRange * downRatio) {
            this.liquidlong();
            this.current_action = SEEK_LONG;
        }
    }

    tpLongOnClose() {
        console.log(`[System::tpLongOnClose] seeking for TP Long Signal for ${this.exchange_str}:${this.symbol_str} position: ${this.position.open} ${this.position.close}`);
        if (this.current_action !== LONG) {
            return;
        }
        const close = this.buffer.chart.period.close;

        const positionRange = this.position.open - this.position.close;
        const downRatio = 0.5;
        if (close > this.position.close + positionRange * downRatio) {
            this.liquidlong();
            this.current_action = SEEK_LONG;
        }
    }


    closeLongOnClose() {
        console.log(`[System::tpLongOnClose] seeking for Close Long Signal for ${this.exchange_str}:${this.symbol_str} position: ${this.position.open} ${this.position.close}`);
        if (this.current_action !== LONG) {
            return;
        }
        // Require prices and indicators
        const current_ema = this.buffer.indicators['TIENEMA'].period;;
        const e5 = current_ema['5'];
        const e10 = current_ema['10'];

        // Check TP
        // Take TP
        // Change action to STAND
        if (e5 > e10) {
            this.liquidlong();
            this.current_action = STAND;
        }
    }

    slShortOnClose() {
        console.log(`[System::slShortOnClose] seeking for SL Short Signal for ${this.exchange_str}:${this.symbol_str} position: ${this.position.open} ${this.position.close}`);
        if (this.current_action !== SHORT) {
            return;
        }
        // Require prices and indicators
        const close = this.buffer.chart.period.close;

        // Check SL
        // Take SL
        // Change action to SEEK_SHORT
        const positionRange = this.position.close - this.position.open;
        const downRatio = 0.5;
        if (close > this.position.close + positionRange * downRatio) {
            this.liquidshort();
            this.current_action = SEEK_SHORT;
        }
    }

    tpShortOnClose() {
        console.log(`[System::tpShortOnClose] seeking for TP Short Signal for ${this.exchange_str}:${this.symbol_str} position: ${this.position.open} ${this.position.close}`);
        if (this.current_action !== SHORT) {
            return;
        }
        // Require prices and indicators
        const close = this.buffer.chart.period.close;

        // Check SL
        // Take SL
        // Change action to SEEK_SHORT
        const positionRange = this.position.close - this.position.open;
        const downRatio = 0.5;
        if (close < this.position.close - positionRange * downRatio) {
            this.liquidshort();
            this.current_action = SEEK_SHORT;
        }
    }

    closeShortOnClose() {
        console.log(`[System::closeShortOnClose] seeking for Close Short Signal for ${this.exchange_str}:${this.symbol_str} position: ${this.position.open} ${this.position.close}`);
        if (this.current_action !== SHORT) {
            return;
        }
        // Require prices and indicators
        const current_ema = this.buffer.indicators['TIENEMA'].period;
        const e5 = current_ema['5'];
        const e10 = current_ema['10'];

        // Check TP
        // Take TP
        // Change action to STAND
        if (e5 < e10) {
            this.liquidshort();
            this.current_action = STAND;
        }
    }

    seekLong() {
        console.log(`[System::seekLong] seeking for Stand from Long for ${this.exchange_str}:${this.symbol_str} position: ${this.position.open} ${this.position.close}`);
        // Require prices and indicators
        const current_ema = this.buffer.indicators['TIENEMA'].period;
        const e5 = current_ema['5'];
        const e10 = current_ema['10'];

        // Check Stand condition from Long
        // Change action to STAND
        if (e5 > e10) {
            this.current_action = STAND;
        }
    }

    seekShort() {
        console.log(`[System::seekShort] seeking for Stand from Short for ${this.exchange_str}:${this.symbol_str} position: ${this.position.open} ${this.position.close}`);
        // Require prices and indicators
        const current_ema = this.buffer.indicators['TIENEMA'].period;
        const e5 = current_ema['5'];
        const e10 = current_ema['10'];

        // Check Stand condition from Short
        // Change action to STAND
        if (e5 < e10) {
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