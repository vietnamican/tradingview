const moment = require("moment");
const axios = require("axios");
const fs = require("fs");
const path = require('path');

const COMBINE_INDIC_NAME = "Combine Indicator"

class Position {
    constructor(symbol, amount, price, order_id) {
        this.symbol = symbol;
        this.amount = amount;
        this.price = price;
        this.id = this.generateId();
        this.order_id = order_id;
    }
    generateId() {
        return `${this.symbol}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
}

module.exports = class Combine {

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
        this.getPrecision();
        this.isFirst = true;
        this.lasttime = -1;
        this.amount = 50000;
        this.portion_per_position = 0.16;
        this.positions = [];
    }

    getPrecision()
    {
        this.exchange.getInstrumentsInfo({
            category: 'spot',
            symbol: this.symbol_str,
        })
        .then((response) => {
            this.basePrecision = response["result"]["list"][0]["lotSizeFilter"]["basePrecision"]
            this.quotePrecision = response["result"]["list"][0]["lotSizeFilter"]["quotePrecision"]
        })
        .catch((error) => {
            console.error(error);
        });
    }

    start() {
        const chart = this.chart;
        chart.onUpdate(() => { // When price changes
            if (!chart.periods[0]) return;

            if (this.isFirst) {
                this.isFirst = false;
                this.lasttime = chart.periods[0].time;
                this.backup();
            }

            if (chart.periods[0].time != this.lasttime) {
                this.lasttime = chart.periods[0].time
                this.logPrice();
                this.logIndicators();
                this.logPositions();
                this.onClose();
                this.backup();
            } else {
                this.onUpdate();
            }
        });
    }

    logPrice() {
        const periods = this.chart.periods;
        console.log(`[${moment().format()}] ${this.exchange_str}:${this.symbol_str} Time:${periods[0].time} Open:${periods[0].open} High:${periods[0].max} Low:${periods[0].min} Close:${periods[0].close} Volume:${periods[0].volume}`);
    }
    
    logIndicators() {
        const indicator = this.indicators[COMBINE_INDIC_NAME].periods[0];
        console.log(`[${moment().format()}] [${moment(indicator["$time"]*1000).format()}] Buy: ${indicator["Buy"]} Sell: ${indicator["Sell"]} Q1: ${indicator["Q1"]} Q3: ${indicator["Q3"]}`);
    }

    logPositions() {
        if (this.positions.length == 0) {
            console.log(`[${moment().format()}] No positions`);
            return;
        } else {
            console.log(`[${moment().format()}] Positions:`);
        }
        for (let i = 0; i < this.positions.length; i++) {
            console.log(`Position ${i}: ${this.positions[i].amount} ${this.symbol_str} at ${this.positions[i].price}`);
        }
    }

    resume() {
        this.restore();
        this.start();
    }

    restore() {
        if (fs.existsSync(this.resume_path)) {
            const data = JSON.parse(fs.readFileSync(this.resume_path));
            this.isFirst = data.isFirst;
            this.lasttime = data.lasttime;
            this.basePrecision = data.basePrecision;
            this.quotePrecision = data.quotePrecision;
            this.positions = data.positions.map(position => {
                return new Position(position.symbol, position.amount, position.price, position.order_id);
            });
            console.log(`[${moment().format()}] Restore from ${this.resume_path} done`);
        }
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
        data.basePrecision = this.basePrecision;
        data.quotePrecision = this.quotePrecision;
        data.positions = this.positions.map(position => {
            return {
                symbol: position.symbol,
                amount: position.amount,
                price: position.price,
                id: position.id,
                order_id: position.order_id
            };
        });
        fs.writeFileSync(this.resume_path, JSON.stringify(data));
    }

    onClose() {
        const indicator = this.indicators[COMBINE_INDIC_NAME].periods[0];
        const buySignal = indicator["Buy"];
        const sellSignal = indicator["Sell"];
        if(buySignal) {
            this.buy(this.portion_per_position);
            this.backup();
        }
        if(sellSignal) {
            this.sell();
            this.backup();
        }
    }

    onUpdate() {
        // this.logPrice();
        // this.logIndicators();
    }

    async buy(portion_per_position) {
        const amount = Math.floor(this.amount * portion_per_position); // 500 USDT

        this.call(() => {
            return this.exchange.submitOrder({
                        category: 'spot',
                        symbol: this.symbol_str,
                        side: 'Buy',
                        orderType: 'Market',
                        marketUnit: "quoteCoin",
                        qty: String(amount),
                    })
        })
        .then((response) => {
            //TODO check status successful or failed
            if (response.retCode == 0){
                console.log(`Buy successfully ${amount}USDT for ${this.symbol_str} with market price`);
                const amount_basecoin = amount/this.chart.periods[0].close;
                this.positions.push(new Position(this.symbol_str, amount_basecoin, this.chart.periods[0].close, response.result.orderId));
            }
            this.backup();
        })
        .catch(error => {
            console.log(`Error occured when buy ${amount}USDT for ${this.symbol_str} with market price`);
            console.error('Error:', error);
            this.backup();
        });
    }

    async getBalance() {
        await this.call(async () => {
            return this.exchange.getWalletBalance({
                    accountType: 'UNIFIED',
                    coin: 'BTC',
                })
        })
        .then((response) => {
            //TODO check status successful or failed
            this.balance = String(this.floor(response["result"]["list"][0]["coin"][0]["walletBalance"] * 1.0, this.basePrecision));
            this.usdtbalance = String(this.floor(response["result"]["list"][0]["coin"][0]["usdValue"] * 0.98, this.quotePrecision));
            this.backup();
        })
        .catch(error => {
            console.log(`Error occured when get balance symbol ${this.symbol_str}`);
            console.error('Error:', error);
            this.backup();
        });
    }

    async sell() {
        await this.getBalance();
        // if average position get profit
        // 1.01 is cover exchange fee
        for (let i = 0; i < this.positions.length; i++) {
            const position = this.positions[i];
            const profitCondition = this.chart.periods[0].close > position.price * 1.01;
            if(profitCondition) {
                let qty = Math.min(this.floor(position.amount, this.basePrecision), this.floor(this.balance, this.basePrecision));
                if (qty == 0) {
                    console.log(`Sold all ${this.symbol_str} with market price`);
                    return;
                }
                qty = String(qty);
                console.log(`Sell ${qty} ${this.symbol_str} with market price`);
                this.call(() => { 
                    return this.exchange.submitOrder({
                        category: 'spot',
                        symbol: this.symbol_str,
                        side: 'Sell',
                        orderType: 'Market',
                        marketUnit: "baseCoin",
                        qty: qty,
                    })
                })
                .then((response) => {
                    if(response.retCode == 0){    
                        console.log(`Sold ${qty} ${this.symbol_str} with market price`);
                        this.positions = this.positions.filter(p => p.id !== position.id);
                    }
                    this.backup();
                })
                .catch(error => {
                    console.log(`Error occured when sell ${qty} ${this.symbol_str} with market price`);
                    console.error('Error:', error);
                    this.backup();
                });
            }
        }
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

    floor(number, step) {
        const scale = 1 / step;
        return Math.floor(number * scale) / scale;
    }

    round(number, step) {
        const scale = 1 / step;
        return Math.round(number * scale) / scale;
    }
}
