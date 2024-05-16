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

    }
    init() { }
    async updateStatus(i) {
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
            case SEEKING_LONG:
                this.seekingLong();
                break;
            case SEEKING_SHORT:
                this.seekingShort();
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
    //         case SEEKING_LONG:
    //             this.seekingLong();
    //             break;
    //         case SEEKING_SHORT:
    //             this.seekingShort();
    //             break;
    //     }
    // }

    takePosition() {
        // Require prices and indicators

        // Check long
        // Take long
        // Change action to long

        // Check long
        // Take long
        // Change action to short
    }

    slLongOnClose() {
        // Require prices and indicators

        // Check SL
        // Take SL
        // Change action to SEEKING_LONG
    }

    tpLongOnClose() {
        // Require prices and indicators

        // Check TP
        // Take TP
        // Change action to SEEKING_LONG
    }

    closeLongOnClose() {
        // Require prices and indicators

        // Check TP
        // Take TP
        // Change action to STAND
    }

    slShortOnClose() {
        // Require prices and indicators

        // Check SL
        // Take SL
        // Change action to SEEKING_SHORT
    }

    tpShortOnClose() {
        // Require prices and indicators

        // Check TP
        // Take TP
        // Change action to SEEKING_SHORT
    }

    closeShortOnClose() {
        // Require prices and indicators

        // Check TP
        // Take TP
        // Change action to STAND
    }


    seekLong() {
        // Require prices and indicators

        // Check Stand condition from Long
        // Change action to STAND
    }

    seekShort() {
        // Require prices and indicators

        // Check Stand condition from Short
        // Change action to STAND
    }


    // triggered by takePosition
    long() {

    }

    // triggerd by slLongOnClose/tpLongOnClose/closeLongOnClose
    liquidlong() {

    }

    // triggered by takePosition
    short() {

    }

    // triggerd by slShortOnClose/tpShortOnClose/closeShortOnClose
    liquidshort() {

    }
}