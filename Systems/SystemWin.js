const moment = require("moment");
const axios = require("axios");

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


    // mode: forward or replay
    constructor(exchange_str, exchange, symbol_str, timeframe_str, chart, indicators, mode = "forward") {
        this.exchange_str = exchange_str;
        this.exchange = exchange;
        this.chart = chart;
        this.symbol_str = symbol_str;
        this.timeframe_str = timeframe_str;
        this.indicators = indicators;
        this.current_action = STAND;
        this.current_status = FREE;
        axios.get(`https://api-testnet.bybit.com/v5/market/instruments-info?category=linear&symbol=${this.symbol_str}`).then(res => {
            this.qtyStep = res.data.result.list[0].lotSizeFilter.qtyStep;
        });
    }

    start() {
        const chart = this.chart;
        chart.onUpdate(() => { // When price changes
            if (!chart.periods[0]) return;

            if (chart.periods[0].time != this.lasttime) {
                this.lasttime = chart.periods[0].time
                console.log(`[${moment().format()}] ${this.exchange_str}:${this.symbol_str} Time:${this.tvtime} Open:${this.tvopen} High:${this.tvhigh} Low:${this.tvlow} Close:${this.tvclose} Volume:${this.tvvolume}`);
                this.trade();
            }
            else {
                this.tvtime = chart.periods[0].time
                this.tvopen = chart.periods[0].open
                this.tvhigh = chart.periods[0].max
                this.tvlow = chart.periods[0].min
                this.tvclose = chart.periods[0].close
                this.tvvolume = chart.periods[0].volume
            }
        });
        chart.onError(()=>{
            
        }) 
    }

    trade() {
        if (this.lasttime === -1 || this.tvtime === -1 || this.tvopen === -1 || this.tvhigh === -1 || this.tvlow === -1 || this.tvclose === -1 || this.tvvolume === -1) {
            return;
        }
        if (this.current_action === STAND) {
            this.longshot();
        } else if (this.current_action == LONG) {
            this.freelong();
        } else if (this.current_action == SHORT) {
            this.freeshort();
        }
    }

    longshot() {
        const close = this.chart.periods[0].close;
        const current_ema = this.indicators['TIENEMA'].periods[0];
        const e5 = current_ema['5'];
        const e10 = current_ema['10'];
        const e20 = current_ema['20'];
        const e50 = current_ema['50'];
        const e100 = current_ema['100'];
        const e200 = current_ema['200'];
        const current_rsi = this.indicators["TIENRSI"].periods[0];
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
        const current_ema = this.indicators['TIENEMA'].periods[0];
        const e5 = current_ema['5'];
        const e10 = current_ema['10'];
        const e20 = current_ema['20'];
        const e50 = current_ema['50'];
        const e200 = current_ema['200'];
        const current_rsi = this.indicators["TIENRSI"].periods[0];
        const rsi = current_rsi["RSI"]
        const rsi_fast = current_rsi["RSIbased_MA"];
        const rsi_slow = current_rsi["RSIbased_MA_2"];
        if (e5 < e10) {
            this.current_status = LIQUID;
            this.take_trade();
        }
    }

    freeshort() {
        const current_ema = this.indicators['TIENEMA'].periods[0];
        const e5 = current_ema['5'];
        const e10 = current_ema['10'];
        const e20 = current_ema['20'];
        const e50 = current_ema['50'];
        const e200 = current_ema['200'];
        const current_rsi = this.indicators["TIENRSI"].periods[0];
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
        } else if (this.current_action === LONG && this.current_status === FREE) {
            this.buy();
        } else if (this.current_action === SHORT && this.current_status === LIQUID) {
            this.current_action = STAND;
            this.current_status = FREE;
            this.liquidsell();
        } else if (this.current_action === SHORT && this.current_status === FREE) {
            this.sell();
        }
    }

    async buy() {
        const amount = 1000; // 100 USDT
        const price = this.tvclose;
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

    async liquidbuy() {
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
                this.current_action = LONG;
                this.current_status = LIQUID;
            });
    }

    sell() {
        const amount = 1000; // 100 USDT
        const price = this.tvclose;
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

    async liquidsell() {
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
                console.log(`Error occured when liquid buy ${qty} ${this.symbol_str} with price ${price}`);
                console.error('Error:', error);
                this.current_action = SHORT;
                this.current_status = LIQUID;
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
}