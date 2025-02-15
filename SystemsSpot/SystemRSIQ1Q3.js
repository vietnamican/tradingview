const moment = require("moment");
const axios = require("axios");
const fs = require("fs");
const path = require('path');

const STAND = 0;
const QSIGNAL = 1;
const WAITSIGNAL = 2;
const RSI_INDIC_NAME = "TIENRSI"
const Q_INDIC_NAME = "Tien Q1 Q3 Breakout Strategy"

module.exports = class SystemRSIQ1Q3 {

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
        this.getPrecision();
        this.isFirst = true;
        this.lasttime = -1;
        this.not_haven_buy = true;
        this.current_action = STAND;
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
        const indicator = this.indicators[Q_INDIC_NAME].periods[0];
        console.log(`[${moment().format()}] [${moment(indicator["$time"]*1000).format()}] Buy: ${indicator["Buy"]} Sell: ${indicator["Sell"]} Q1: ${indicator["Q1"]} Q3: ${indicator["Q3"]}`);
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
            this.not_haven_buy = data.not_haven_buy;
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
        data.not_haven_buy = this.not_haven_buy;
        fs.writeFileSync(this.resume_path, JSON.stringify(data));
    }

    onClose() {
        switch(this.current_action) {
            case STAND:
                this.takePosition();
                break
            case QSIGNAL:
                this.waitRSI();
                break;
            case WAITSIGNAL:
                this.buyNowOrNot();
        }
        // if(buySignal){
        //     this.buy();
        // }
        // if(sellSignal){
        //     // console.log(this.not_haven_buy);
        //     if(this.not_haven_buy){
        //         return;
        //     }
        //     this.sell();
        // }
    }

    onUpdate() {
        // console.log(this.not_haven_buy);
        // this.logPrice();
        // this.logIndicators();
    }

    takePosition() {
        const indicator = this.indicators[Q_INDIC_NAME].periods[0];
        const buySignal = indicator["Buy"];
        const sellSignal = indicator["Sell"];

        

        if(buySignal){
            this.current_action = QSIGNAL;
            this.backup();
            return;
        }

        //TODO write on another function
        if(sellSignal){
            // console.log(this.not_haven_buy);
            if(this.not_haven_buy){
                return;
            }
            this.sell();
            return;
        }
    }

    waitRSI() {
        // how to wait for one candle: change to stand action immediately if not buy
        const rsiIndic = this.indicators[RSI_INDIC_NAME].periods[0];
        rsi = rsiIndic["RSI"];
        fastMa = rsiIndic["RSIbased_MA"];
        slowMa = rsiIndic["RSIbased_MA_2"];
        rsiCondition = rsi > fastMa || rsi > slowMa;

        const qIndic = this.indicators[Q_INDIC_NAME].periods[0];
        const q1 = qIndic["Q1"];
        const q3 = qIndic["Q3"];
        const closePrice = this.chart.periods[0].close;
        closeCondition = closePrice > q1 && closePrice < q3;

        condition = rsiCondition && closeCondition;
        if (condition) {
            this.buy();
        }
        
        this.current_action = STAND;
    }

    async buy() {
        const amount = 500 // 500 USDT

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
            console.log(`Buy successfully ${amount}USDT for ${this.symbol_str} with market price`);
            this.not_haven_buy = false;
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
        this.call(() => { 
            return this.exchange.submitOrder({
                    category: 'spot',
                    symbol: this.symbol_str,
                    side: 'Sell',
                    orderType: 'Market',
                    marketUnit: "baseCoin",
                    qty: this.balance,
                })
        })
        .then((response) => {
            console.log(`Sell all ${this.balance}USDT for ${this.symbol_str} with market price`);
            this.not_haven_buy = true;
            this.backup();
        })
        .catch(error => {
            console.log(`Error occured when sell all ${this.balance} for ${this.symbol_str} with market price`);
            console.error('Error:', error);
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

    floor(number, step) {
        return Math.floor(number / step) * step;
    }

    round(number, step) {
        return Math.round(number / step) * step;
    }
}
